import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { PURCHASE_REFERRER_BONUS, PURCHASE_REFEREE_BONUS } from '@/lib/referral';
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

  // 추천 리워드: 추천받은 사람의 "첫 구매 확정"이면 추천인+피추천인 모두에게 포인트 지급
  const buyer = await prisma.user.findUnique({ where: { id: order.buyerId } });
  if (buyer?.referredById && !buyer.firstPurchaseRewardGiven) {
    const confirmedCount = await prisma.order.count({
      where: { buyerId: buyer.id, paymentStatus: 'CONFIRMED' },
    });
    if (confirmedCount === 1) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: buyer.referredById },
          data: { pointBalance: { increment: PURCHASE_REFERRER_BONUS } },
        }),
        prisma.user.update({
          where: { id: buyer.id },
          data: { pointBalance: { increment: PURCHASE_REFEREE_BONUS }, firstPurchaseRewardGiven: true },
        }),
      ]);
    }
  }

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
