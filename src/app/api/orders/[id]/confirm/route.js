import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { applyFirstPurchaseRewardIfNeeded } from '@/lib/rewards';
import { notify } from '@/lib/notify';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { event: true } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.event.hostId !== user.id) {
    return NextResponse.json({ error: '공구 개설자만 입금을 확인할 수 있어요.' }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { paymentStatus: 'CONFIRMED' },
    include: { option: true, buyer: { select: { id: true, name: true } } },
  });

  await applyFirstPurchaseRewardIfNeeded(order.buyerId);

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', updated);

  await notify(order.buyerId, {
    type: 'payment_confirmed',
    title: '입금이 확인됐어요',
    body: `"${order.event.title}" 주문의 입금이 확인됐습니다.`,
    url: `/events/${order.eventId}`,
  });

  return NextResponse.json({ order: updated });
}
