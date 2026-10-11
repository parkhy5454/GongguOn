import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { normalizeCode, calcCouponDiscount } from '@/lib/coupon';
import { checkRateLimit } from '@/lib/rateLimit';

// 쿠폰 코드를 입력했을 때 "이 주문에서 얼마 할인되는지" 미리 보여주는 용도 (실제 사용은 주문 시점에 확정)
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 쿠폰 코드 무차별 대입 방지
  const rl = await checkRateLimit(`coupon-check:${user.id}`, { max: 30, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: '시도가 너무 많아요. 잠시 후 다시 해주세요.' }, { status: 429 });

  const { code, amount } = await req.json();
  const normalized = normalizeCode(code);
  const amt = Number(amount);
  if (!normalized || !amt || amt < 1) return NextResponse.json({ error: '쿠폰 코드를 입력해주세요.' }, { status: 400 });

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon) return NextResponse.json({ error: '존재하지 않는 쿠폰이에요.' }, { status: 404 });

  const used = await prisma.couponRedemption.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId: user.id } } });
  if (used) return NextResponse.json({ error: '이미 사용한 쿠폰이에요. (1인 1회)' }, { status: 400 });

  const calc = calcCouponDiscount(coupon, amt);
  if (!calc.ok) return NextResponse.json({ error: calc.error }, { status: 400 });

  return NextResponse.json({ code: coupon.code, discount: calc.discount, description: coupon.description || null });
}
