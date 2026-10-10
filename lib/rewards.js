const { prisma } = require('./prisma');
const { PURCHASE_REFERRER_BONUS, PURCHASE_REFEREE_BONUS } = require('./referral');

// 특정 구매자의 주문이 CONFIRMED(결제 완료 확정)됐을 때 호출.
// 그 구매자의 "생애 첫 결제 확정"이면 추천인+피추천인에게 포인트를 지급합니다.
async function applyFirstPurchaseRewardIfNeeded(buyerId) {
  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!buyer?.referredById || buyer.firstPurchaseRewardGiven) return;

  const confirmedCount = await prisma.order.count({
    where: { buyerId: buyer.id, paymentStatus: 'CONFIRMED' },
  });
  if (confirmedCount !== 1) return;

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

module.exports = { applyFirstPurchaseRewardIfNeeded };
