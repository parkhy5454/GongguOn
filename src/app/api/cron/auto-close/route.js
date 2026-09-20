import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notify';
import { cancelTossPayment } from '@/lib/toss';

// 외부 무료 스케줄러가 주기적으로(예: 30분마다) 이 URL을 호출하도록 설정하세요.
// https://your-app.onrender.com/api/cron/auto-close?secret=CRON_SECRET값
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const expiredEvents = await prisma.event.findMany({
    where: { status: 'OPEN', deadline: { lt: now } },
    include: { orders: true },
  });

  let closed = 0;
  let cancelledWithRefund = 0;

  for (const event of expiredEvents) {
    const totalQty = event.orders.reduce((s, o) => s + o.quantity, 0);
    const isSuccess = totalQty >= event.minQuantity;

    if (isSuccess) {
      await prisma.event.update({ where: { id: event.id }, data: { status: 'CLOSED' } });
      closed++;
      const buyerIds = [...new Set(event.orders.map((o) => o.buyerId))];
      for (const buyerId of buyerIds) {
        await notify(buyerId, {
          type: 'event_status',
          title: '공구가 마감됐어요 (성사)',
          body: `"${event.title}" 최소 수량을 채워 마감됐어요. 곧 정산/배송이 진행돼요.`,
          url: `/events/${event.id}`,
        });
      }
      continue;
    }

    // 최소 수량 미달 → 취소 + 결제된 주문 전원 자동 환불
    await prisma.event.update({ where: { id: event.id }, data: { status: 'CANCELLED' } });
    cancelledWithRefund++;

    for (const order of event.orders) {
      if (!['PAID', 'CONFIRMED'].includes(order.paymentStatus)) continue;

      if (order.paymentMethod === 'CARD' && order.tossPaymentKey) {
        await cancelTossPayment({ paymentKey: order.tossPaymentKey, cancelReason: '최소 성사 수량 미달로 공구가 취소됐어요.' }).catch(() => {});
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'REFUNDED', refundedAt: new Date(), refundReason: '최소 성사 수량 미달' },
      });
      if (order.pointsUsed > 0) {
        await prisma.user.update({ where: { id: order.buyerId }, data: { pointBalance: { increment: order.pointsUsed } } });
      }
      await notify(order.buyerId, {
        type: 'refunded',
        title: '공구가 불발되어 환불됐어요',
        body: `"${event.title}"가 최소 성사 수량을 채우지 못해 자동 취소·환불됐어요.`,
        url: `/events/${event.id}`,
      });
    }
  }

  return NextResponse.json({ checked: expiredEvents.length, closed, cancelledWithRefund });
}
