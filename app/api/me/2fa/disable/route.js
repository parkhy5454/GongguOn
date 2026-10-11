import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { verifyUserCode } from '@/lib/totp';
import { checkRateLimit } from '@/lib/rateLimit';

// 끄려면 비밀번호 + 현재 인증 코드가 모두 필요
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = await checkRateLimit(`2fa-disable:${user.id}`, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: '시도가 너무 많아요. 잠시 후 다시 해주세요.' }, { status: 429 });

  const { password, code } = await req.json();
  if (!user.totpEnabled) return NextResponse.json({ error: '2단계 인증이 켜져 있지 않아요.' }, { status: 400 });
  if (!password || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }
  if (!verifyUserCode(user, code)) {
    return NextResponse.json({ error: '인증 코드가 맞지 않아요.' }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpLastStep: null },
  });
  return NextResponse.json({ ok: true });
}
