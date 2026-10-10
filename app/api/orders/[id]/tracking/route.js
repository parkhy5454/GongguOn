import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { notify } from '@/lib/notify';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { event: true } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.event.hostId !== user.id) {
    return NextResponse.json({ error: '공구 개설자만 송장을 등록할 수 있어요.' }, { status: 403 });
  }

  const { trackingCompany, trackingNumber } = await req.json();

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      trackingCompany: trackingCompany?.trim() || null,
      trackingNumber: trackingNumber?.trim() || null,
    },
    include: { option: true, buyer: { select: { id: true, name: true } } },
  });

  if (trackingNumber?.trim()) {
    await notify(order.buyerId, {
      type: 'tracking_added',
      title: '송장번호가 등록됐어요',
      body: `"${order.event.title}" 주문 · ${trackingCompany || ''} ${trackingNumber}`,
      url: `/events/${order.eventId}`,
    });
  }

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', updated);

  return NextResponse.json({ order: updated });
}
