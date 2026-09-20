const { prisma } = require('./prisma');
const { applyFirstPurchaseRewardIfNeeded } = require('./rewards');
const { notify } = require('./notify');

// 주문을 "결제 확정" 상태로 확정 처리 (이미 확정된 경우 아무 것도 하지 않음 — 중복 방지)
async function finalizeOrderConfirmed(orderId, { tossPaymentKey } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true } });
  if (!order || order.paymentStatus === 'CONFIRMED' || order.paymentStatus === 'REFUNDED') {
    return null; // 이미 처리됐거나 없는 주문 — 안전하게 무시
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'CONFIRMED', tossPaymentKey: tossPaymentKey || order.tossPaymentKey },
    include: { option: true, buyer: { select: { id: true, name: true } } },
  });

  await applyFirstPurchaseRewardIfNeeded(order.buyerId);

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', updated);

  await notify(order.buyerId, {
    type: 'payment_confirmed',
    title: '결제가 확인됐어요',
    body: `"${order.event.title}" 주문 결제가 확인됐습니다.`,
    url: `/events/${order.eventId}`,
  });

  return updated;
}

// 주문을 "환불" 상태로 처리 (재고/포인트 복구 포함, 중복 방지)
async function finalizeOrderRefunded(orderId, reason) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true } });
  if (!order || order.paymentStatus === 'REFUNDED') return null;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'REFUNDED', refundedAt: new Date(), refundReason: reason || '결제 취소' },
    }),
    prisma.eventOption.update({ where: { id: order.optionId }, data: { soldCount: { decrement: order.quantity } } }),
    ...(order.pointsUsed > 0
      ? [prisma.user.update({ where: { id: order.buyerId }, data: { pointBalance: { increment: order.pointsUsed } } })]
      : []),
  ]);

  await notify(order.buyerId, {
    type: 'refunded',
    title: '환불이 처리됐어요',
    body: `"${order.event.title}" 주문이 환불됐어요.`,
    url: `/events/${order.eventId}`,
  });

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', { id: order.id, eventId: order.eventId });

  return true;
}

module.exports = { finalizeOrderConfirmed, finalizeOrderRefunded };
