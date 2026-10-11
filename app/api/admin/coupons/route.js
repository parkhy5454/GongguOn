import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { logAdminAction } from '@/lib/adminLog';
import { normalizeCode } from '@/lib/coupon';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({ coupons });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const b = await req.json();
  const code = normalizeCode(b.code);
  const type = b.type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
  const value = Number(b.value);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    return NextResponse.json({ error: '코드는 영문 대문자·숫자·-·_ 로 3~30자로 입력해주세요.' }, { status: 400 });
  }
  if (!Number.isInteger(value) || value < 1 || (type === 'PERCENT' && value > 90)) {
    return NextResponse.json({ error: type === 'PERCENT' ? '할인율은 1~90 사이 정수로 입력해주세요.' : '할인 금액을 1원 이상으로 입력해주세요.' }, { status: 400 });
  }
  const intOrNull = (v) => (v === '' || v == null ? null : Math.max(0, Math.floor(Number(v))) || null);
  const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
  if (expiresAt && isNaN(expiresAt.getTime())) return NextResponse.json({ error: '만료일이 올바르지 않아요.' }, { status: 400 });

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code, type, value,
        description: b.description ? String(b.description).slice(0, 100) : null,
        maxDiscount: type === 'PERCENT' ? intOrNull(b.maxDiscount) : null,
        minOrderAmount: Math.max(0, Math.floor(Number(b.minOrderAmount) || 0)),
        maxUses: intOrNull(b.maxUses),
        expiresAt,
      },
    });
    await logAdminAction(admin.id, 'coupon_create', `code=${code}`);
    return NextResponse.json({ coupon });
  } catch (err) {
    if (err.code === 'P2002') return NextResponse.json({ error: '이미 있는 쿠폰 코드예요.' }, { status: 400 });
    throw err;
  }
}
