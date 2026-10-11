import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { logAdminAction } from '@/lib/adminLog';
import { notify } from '@/lib/notify';

// 인증 판매자 배지 부여/해제 (사업자·본인 확인을 마친 판매자에게 부여)
export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const admin = await getCurrentUser();
  if (!admin || !isAdminEmail(admin.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { verified } = await req.json();
  const u = await prisma.user.update({ where: { id: params.id }, data: { sellerVerified: !!verified }, select: { id: true, name: true, sellerVerified: true } }).catch(() => null);
  if (!u) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await logAdminAction(admin.id, 'seller_verify', `userId=${u.id}, verified=${u.sellerVerified}`);
  if (u.sellerVerified) {
    await notify(u.id, {
      type: 'event_status',
      title: '인증 판매자로 확인됐어요 ✅',
      body: '내 공구와 프로필에 인증 판매자 배지가 표시돼요.',
      url: '/my',
    });
  }
  return NextResponse.json({ user: u });
}
