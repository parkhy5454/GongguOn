const { prisma } = require('./prisma');
const { applyFirstPurchaseRewardIfNeeded } = require('./rewards');
const { notify } = require('./notify');
const { cancelTossPayment } = require('./toss');
const { decryptAccount } = require('./banks');

// 쿠폰을 쓴 주문이 취소/환불되면 쿠폰 사용 기록을 되돌려서 다시 쓸 수 있게 함
async function restoreCoupon(tx, orderId) {
  const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
  if (!redemption) return;
  await tx.couponRedemption.delete({ where: { id: redemption.id } });
  await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { decrement: 1 } } });
}

// 결제 확정 후 판매자에게 "새 주문" 알림 (카드는 confirm 시점, 가상계좌는 입금 확인 시점에 호출)
async function notifyHostPaid(order, buyerName, label) {
  const full = order.event ? order : await prisma.order.findUnique({ where: { id: order.id }, include: { event: true } });
  if (!full) return;
  await notify(full.event.hostId, {
    type: 'new_order',
    title: `${label} 결제가 완료됐어요`,
    body: `"${full.event.title}"에 ${buyerName || '구매자'}님이 ${label}로 결제 완료했어요.`,
    url: `/events/${full.eventId}`,
  });
}

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

// 주문을 "환불" 상태로 처리 (재고/포인트/쿠폰 복구 포함, 중복 방지)
async function finalizeOrderRefunded(orderId, reason, notice) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true } });
  if (!order || order.paymentStatus === 'REFUNDED') return null;

  const done = await prisma.$transaction(async (tx) => {
    // 동시에 두 번 처리되는 것을 막기 위해, 아직 환불 전인 경우에만 상태를 바꿈
    const res = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { not: 'REFUNDED' } },
      data: { paymentStatus: 'REFUNDED', refundedAt: new Date(), refundReason: reason || '결제 취소', refundAccountEnc: null },
    });
    if (res.count === 0) return false;
    await tx.eventOption.update({ where: { id: order.optionId }, data: { soldCount: { decrement: order.quantity } } });
    if (order.pointsUsed > 0) {
      await tx.user.update({ where: { id: order.buyerId }, data: { pointBalance: { increment: order.pointsUsed } } });
    }
    await restoreCoupon(tx, orderId);
    return true;
  });
  if (!done) return null;

  await notify(order.buyerId, {
    type: 'refunded',
    title: (notice && notice.title) || '환불이 처리됐어요',
    body: (notice && notice.body) || `"${order.event.title}" 주문이 환불됐어요.`,
    url: `/events/${order.eventId}`,
  });

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', { id: order.id, eventId: order.eventId });

  return true;
}

// 아직 결제가 시작되지 않은(PENDING) 주문을 없던 일로 되돌림: 재고·포인트·쿠폰을 복구하고 주문 삭제
async function releasePendingOrder(orderId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus !== 'PENDING') return false;
    await restoreCoupon(tx, order.id);
    await tx.eventOption.update({ where: { id: order.optionId }, data: { soldCount: { decrement: order.quantity } } });
    if (order.pointsUsed > 0) {
      await tx.user.update({ where: { id: order.buyerId }, data: { pointBalance: { increment: order.pointsUsed } } });
    }
    await tx.order.delete({ where: { id: order.id } });
    return true;
  });
}

// 결제수단별로 토스에 실제 결제 취소를 요청. 성공(또는 이미 취소됨)이면 {} , 실패하면 { error }
//  - 카드: 그대로 취소
//  - 가상계좌: 입금 전이면 계좌만 무효화, 입금 후면 가입 때 받아둔 환불 계좌로 환불
//  - 계좌이체(직접 입금): 토스를 거치지 않으므로 할 일 없음
async function cancelPaymentAtToss(order, reason) {
  if (!order.tossPaymentKey) return {};
  if (order.paymentMethod !== 'CARD' && order.paymentMethod !== 'VIRTUAL_ACCOUNT') return {};

  let refundReceiveAccount;
  if (order.paymentMethod === 'VIRTUAL_ACCOUNT' && order.paymentStatus !== 'PENDING') {
    refundReceiveAccount = decryptAccount(order.refundAccountEnc);
    if (!refundReceiveAccount) {
      return { error: '환불 계좌 정보가 없어 자동 환불할 수 없어요. 구매자에게 확인 후 토스페이먼츠 상점관리자에서 직접 환불해주세요.' };
    }
  }
  const { error, code } = await cancelTossPayment({ paymentKey: order.tossPaymentKey, cancelReason: reason, refundReceiveAccount });
  if (error && code !== 'ALREADY_CANCELED_PAYMENT') return { error };
  return {};
}

module.exports = { finalizeOrderConfirmed, finalizeOrderRefunded, releasePendingOrder, cancelPaymentAtToss, notifyHostPaid, restoreCoupon };
