const test = require('node:test');
const assert = require('node:assert');

const { verifyTotp, generateSecret } = require('../lib/totp');
const { validatePassword } = require('../lib/passwordPolicy');
const { applicableDiscount, priceWithDiscount } = require('../lib/pricing');
const { normalizeCode, calcCouponDiscount } = require('../lib/coupon');
const { parseCsv, csvEscape } = require('../lib/csv');
const { BANKS, validateRefundAccount, bankName } = require('../lib/banks');
const { normalizeProfile } = require('../lib/kakao');

test('TOTP: RFC 6238 테스트 벡터', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // ASCII "12345678901234567890"
  assert.ok(verifyTotp(secret, '287082', 59000));
  assert.ok(!verifyTotp(secret, '000000', 59000));
  assert.ok(generateSecret().length >= 16);
});

test('비밀번호 규칙', () => {
  assert.ok(validatePassword('abc12'));
  assert.ok(validatePassword('abcdefgh'));
  assert.ok(validatePassword('12345678'));
  assert.strictEqual(validatePassword('abcd1234'), null);
});

test('인원 연동 할인', () => {
  const tiers = [{ minParticipants: 5, discountPercent: 5 }, { minParticipants: 10, discountPercent: 10 }];
  assert.strictEqual(applicableDiscount(tiers, 4), 0);
  assert.strictEqual(applicableDiscount(tiers, 5), 5);
  assert.strictEqual(applicableDiscount(tiers, 12), 10);
  assert.strictEqual(priceWithDiscount(10000, 10), 9000);
});

test('쿠폰 계산', () => {
  assert.strictEqual(normalizeCode(' welcome 10 '), 'WELCOME10');
  const pct = { active: true, type: 'PERCENT', value: 10, maxDiscount: 1500, minOrderAmount: 10000, usedCount: 0 };
  assert.deepStrictEqual(calcCouponDiscount(pct, 10000), { ok: true, discount: 1000 });
  assert.strictEqual(calcCouponDiscount(pct, 50000).discount, 1500);
  assert.strictEqual(calcCouponDiscount(pct, 5000).ok, false);
  const amt = { active: true, type: 'AMOUNT', value: 3000, usedCount: 0 };
  assert.strictEqual(calcCouponDiscount(amt, 2000).discount, 2000);
  assert.strictEqual(calcCouponDiscount({ ...amt, active: false }, 9000).ok, false);
  assert.strictEqual(calcCouponDiscount({ ...amt, maxUses: 5, usedCount: 5 }, 9000).ok, false);
  assert.strictEqual(calcCouponDiscount({ ...amt, expiresAt: new Date(Date.now() - 1000) }, 9000).ok, false);
});

test('CSV 파싱/이스케이프', () => {
  const rows = parseCsv('﻿주문번호,택배사,송장번호\r\nabc,"CJ,대한통운","123"\n');
  assert.deepStrictEqual(rows, [['주문번호', '택배사', '송장번호'], ['abc', 'CJ,대한통운', '123']]);
  assert.deepStrictEqual(parseCsv(csvEscape('a"b,c') + ',x'), [['a"b,c', 'x']]);
});

test('환불 계좌 검증', () => {
  assert.ok(validateRefundAccount({}).error);
  assert.ok(validateRefundAccount({ bank: '99', accountNumber: '123456789012', holderName: '홍길동' }).error);
  const ok = validateRefundAccount({ bank: BANKS[0].code, accountNumber: '110-123-456789', holderName: '홍길동' });
  assert.strictEqual(ok.account.accountNumber, '110123456789');
  assert.strictEqual(bankName('90'), '카카오뱅크');
});

test('카카오 프로필 정리', () => {
  const p = normalizeProfile({ id: 123, kakao_account: { email: 'A@b.com', is_email_valid: true, is_email_verified: true, profile: { nickname: '닉' } } });
  assert.deepStrictEqual(p, { kakaoId: '123', nickname: '닉', email: 'a@b.com', emailVerified: true });
  assert.strictEqual(normalizeProfile({ id: 1, kakao_account: { email: 'x@y.z', is_email_verified: false } }).emailVerified, false);
  assert.strictEqual(normalizeProfile({ id: 1 }).email, null);
});
