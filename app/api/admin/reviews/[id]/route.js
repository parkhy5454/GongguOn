import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { logAdminAction } from '@/lib/adminLog';

// 부적절한 후기 숨김/복구 (숨긴 후기는 목록과 평점 계산에서 빠져요)
export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const admin = await getCurrentUser();
  if (!admin || !isAdminEmail(admin.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { hidden } = await req.json();
  const review = await prisma.review.update({ where: { id: params.id }, data: { hidden: !!hidden } }).catch(() => null);
  if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await logAdminAction(admin.id, 'review_hide', `reviewId=${review.id}, hidden=${review.hidden}`);
  return NextResponse.json({ review });
}
