import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notify';
import { finalizeOrderRefunded, releasePendingOrder, cancelPaymentAtToss } from '@/lib/paymentReconcile';
import { sendAlert } from '@/lib/alert';

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
  let refundFailures = 0;

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

      if (order.paymentStatus === 'PENDING') {
        // 아직 결제 전 → 발급된 가상계좌가 있으면 무효화하고, 잡아둔 재고·포인트·쿠폰을 풀어줌 (알림 없이 조용히)
        if (order.paymentMethod === 'VIRTUAL_ACCOUNT' && order.tossPaymentKey) {
          const { error } = await cancelPaymentAtToss(order, '최소 성사 수량 미달로 공구가 취소됐어요.');
          if (error) await sendAlert('가상계좌 무효화 실패', `order=${order.id}: ${error}`).catch(() => {});
        }
        await releasePendingOrder(order.id).catch(() => {});
        continue;
      }

      // 결제된 주문 → 토스 환불이 성공해야만 환불 처리 (실패하면 돈이 그대로이므로 상태를 바꾸지 않고 운영자에게 알림)
      const { error } = await cancelPaymentAtToss(order, '최소 성사 수량 미달로 공구가 취소됐어요.');
      if (error) {
        refundFailures++;
        await sendAlert('자동 환불 실패 (직접 확인 필요)', `order=${order.id}, event=${event.id}: ${error}`).catch(() => {});
        continue;
      }
      await finalizeOrderRefunded(order.id, '최소 성사 수량 미달', {
        title: '공구가 불발되어 환불됐어요',
        body: `"${event.title}"가 최소 성사 수량을 채우지 못해 자동 취소·환불됐어요.`,
      });
    }
  }

  // 결제 대기 상태로 방치된 주문 정리 (재고/포인트/쿠폰이 묶여있음)
  //  - 카드·가상계좌: 결제창만 열고 24시간 넘게 이탈한 주문
  //  - 가상계좌: 입금 기한이 지난 주문 (발급된 계좌도 무효화 시도)
  const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleOrders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PENDING',
      OR: [
        { paymentMethod: { in: ['CARD', 'VIRTUAL_ACCOUNT'] }, vaNumber: null, createdAt: { lt: staleCutoff } },
        { paymentMethod: 'VIRTUAL_ACCOUNT', vaNumber: { not: null }, vaDue: { lt: now } },
      ],
    },
  });

  let staleCancelled = 0;
  for (const order of staleOrders) {
    if (order.paymentMethod === 'VIRTUAL_ACCOUNT' && order.tossPaymentKey) {
      await cancelPaymentAtToss(order, '입금 기한이 지나 주문이 취소됐어요.').catch(() => {});
    }
    const ok = await releasePendingOrder(order.id).catch(() => false);
    if (ok) staleCancelled++;
  }

  return NextResponse.json({ checked: expiredEvents.length, closed, cancelledWithRefund, refundFailures, staleOrdersCancelled: staleCancelled });
}
