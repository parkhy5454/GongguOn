// 참여 인원 수에 따라 적용 가능한 최대 할인율을 계산 (핀둬둬식 인원 연동 할인)
function applicableDiscount(tiers, participantCount) {
  if (!tiers || tiers.length === 0) return 0;
  const eligible = tiers.filter((t) => participantCount >= t.minParticipants);
  if (eligible.length === 0) return 0;
  return Math.max(...eligible.map((t) => t.discountPercent));
}

function priceWithDiscount(basePrice, discountPercent) {
  return Math.round(basePrice * (1 - discountPercent / 100));
}

module.exports = { applicableDiscount, priceWithDiscount };
