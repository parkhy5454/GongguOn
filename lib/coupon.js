// 쿠폰 할인액 계산 (순수 함수 — DB를 쓰지 않아 테스트하기 쉬워요)
// coupon: { type: 'PERCENT' | 'AMOUNT', value, maxDiscount, minOrderAmount, active, expiresAt }
// amount: 쿠폰 적용 전 상품 금액(원)
function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

function calcCouponDiscount(coupon, amount, now = new Date()) {
  if (!coupon || !coupon.active) return { ok: false, error: '사용할 수 없는 쿠폰이에요.' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return { ok: false, error: '기간이 지난 쿠폰이에요.' };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { ok: false, error: '쿠폰이 모두 소진됐어요.' };
  if (amount < (coupon.minOrderAmount || 0)) {
    return { ok: false, error: `${(coupon.minOrderAmount || 0).toLocaleString()}원 이상 주문에서 사용할 수 있어요.` };
  }
  let discount = 0;
  if (coupon.type === 'PERCENT') {
    discount = Math.floor((amount * coupon.value) / 100);
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = Math.min(coupon.value, amount);
  }
  discount = Math.max(0, Math.min(discount, amount));
  if (discount <= 0) return { ok: false, error: '이 주문에는 적용할 수 있는 할인이 없어요.' };
  return { ok: true, discount };
}

module.exports = { normalizeCode, calcCouponDiscount };
