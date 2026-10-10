
export function validateOrderPrice(product, currentCount, requestedPrice, quantity) {
  // 서버에서 가격 재계산 - 프론트 조작 방지
  const tiers = (product.priceTiers || []).sort((a,b) => a.count - b.count);
  let expected = product.basePrice || product.price;
  for (const tier of tiers) {
    if (currentCount >= tier.count) expected = tier.price;
  }
  // 수량 곱
  const expectedTotal = expected * quantity;
  // 100원 오차 허용 (쿠폰 등), 그 이상 차이나면 해킹 시도
  if (Math.abs(requestedPrice - expectedTotal) > 100) {
    throw new Error(`PRICE_TAMPERED: expected ${expectedTotal}, got ${requestedPrice}`);
  }
  return expected;
}
