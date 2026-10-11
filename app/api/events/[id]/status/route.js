import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { notify } from '@/lib/notify';

const DELIVERY_LABEL = { PREPARING: '상품 준비중', SHIPPING: '배송중', DONE: '배송 완료' };
const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };

export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (event.hostId !== user.id) {
    return NextResponse.json({ error: '공구를 개설한 판매자만 상태를 변경할 수 있어요.' }, { status: 403 });
  }

  const body = await req.json();
  const data = {};
  if (body.status) data.status = body.status;
  if (body.deliveryStatus) data.deliveryStatus = body.deliveryStatus;

  const updated = await prisma.event.update({ where: { id: params.id }, data });

  const io = global.__io;
  if (io) io.to(`event:${params.id}`).emit('event-updated', updated);

  // 참여자 전원에게 배송/공구 상태 변경 알림
  if (body.deliveryStatus || body.status) {
    const buyers = await prisma.order.findMany({ where: { eventId: params.id }, select: { buyerId: true }, distinct: ['buyerId'] });
    const title = body.deliveryStatus
      ? `배송 상태가 변경됐어요: ${DELIVERY_LABEL[body.deliveryStatus]}`
      : `공구 상태가 변경됐어요: ${STATUS_LABEL[body.status]}`;
    for (const b of buyers) {
      await notify(b.buyerId, {
        type: 'event_status',
        title,
        body: `"${event.title}"`,
        url: `/events/${params.id}`,
      });
    }
  }

  return NextResponse.json({ event: updated });
}
