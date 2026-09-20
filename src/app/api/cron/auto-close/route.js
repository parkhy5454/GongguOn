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

    // 최소 수량 미달 → 취소 + 결제 관련된 모든 주문(PENDING 포함) 정리
    await prisma.event.update({ where: { id: event.id }, data: { status: 'CANCELLED' } });
    cancelledWithRefund++;

    for (const order of event.orders) {
      if (order.paymentStatus === 'REFUNDED') continue;

      if (order.paymentMethod === 'CARD' && order.tossPaymentKey && ['PAID', 'CONFIRMED'].includes(order.paymentStatus)) {
        await cancelTossPayment({ paymentKey: order.tossPaymentKey, cancelReason: '최소 성사 수량 미달로 공구가 취소됐어요.' }).catch(() => {});
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'REFUNDED', refundedAt: new Date(), refundReason: '최소 성사 수량 미달' },
      });
      if (order.pointsUsed > 0) {
        await prisma.user.update({ where: { id: order.buyerId }, data: { pointBalance: { increment: order.pointsUsed } } });
      }
      // 아직 실제 결제(PAID/CONFIRMED)까지 안 간 대기 주문은 애초에 돈이 안 걸려있어 별도 알림 없이 조용히 정리
      if (['PAID', 'CONFIRMED'].includes(order.paymentStatus)) {
        await notify(order.buyerId, {
          type: 'refunded',
          title: '공구가 불발되어 환불됐어요',
          body: `"${event.title}"가 최소 성사 수량을 채우지 못해 자동 취소·환불됐어요.`,
          url: `/events/${event.id}`,
        });
      }
    }
  }

  // 카드결제 대기 상태로 24시간 넘게 방치된 주문 정리 (결제창만 열고 안 닫은 채 이탈한 경우 — 재고/포인트가 묶여있음)
  const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleOrders = await prisma.order.findMany({
    where: { paymentMethod: 'CARD', paymentStatus: 'PENDING', createdAt: { lt: staleCutoff } },
  });

  let staleCancelled = 0;
  for (const order of staleOrders) {
    await prisma.$transaction([
      prisma.order.delete({ where: { id: order.id } }),
      prisma.eventOption.update({ where: { id: order.optionId }, data: { soldCount: { decrement: order.quantity } } }),
      ...(order.pointsUsed > 0
        ? [prisma.user.update({ where: { id: order.buyerId }, data: { pointBalance: { increment: order.pointsUsed } } })]
        : []),
    ]);
    staleCancelled++;
  }

  return NextResponse.json({ checked: expiredEvents.length, closed, cancelledWithRefund, staleCardOrdersCancelled: staleCancelled });
}
