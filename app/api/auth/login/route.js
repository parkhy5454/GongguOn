import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, COOKIE_NAME } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req) {
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });

  // 계정 존재 여부를 노출하지 않기 위해, 없는 계정도 있는 계정과 같은 오류 메시지를 씀
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    return NextResponse.json(
      { error: `로그인 시도가 너무 많아 잠시 잠겼어요. ${minutesLeft}분 후 다시 시도해주세요.` },
      { status: 429 }
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);

  if (!ok) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const data = { failedLoginAttempts: attempts };
    if (attempts >= MAX_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      data.failedLoginAttempts = 0;
    }
    await prisma.user.update({ where: { id: user.id }, data });

    if (data.lockedUntil) {
      return NextResponse.json(
        { error: `비밀번호를 ${MAX_ATTEMPTS}회 틀려서 ${LOCK_MINUTES}분간 잠겼어요. 잠시 후 다시 시도해주세요.` },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  // 로그인 성공 시 실패 카운트 초기화
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  const token = signToken({ sub: user.id, email: user.email, name: user.name, tv: user.tokenVersion });
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
