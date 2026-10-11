import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { logAdminAction } from '@/lib/adminLog';

// 쿠폰 사용 중지/재개
export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const admin = await getCurrentUser();
  if (!admin || !isAdminEmail(admin.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { active } = await req.json();
  const coupon = await prisma.coupon.update({ where: { id: params.id }, data: { active: !!active } }).catch(() => null);
  if (!coupon) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await logAdminAction(admin.id, 'coupon_toggle', `code=${coupon.code}, active=${coupon.active}`);
  return NextResponse.json({ coupon });
}
