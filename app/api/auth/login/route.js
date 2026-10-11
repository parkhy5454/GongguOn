import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, signShortToken, verifyToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/turnstile';
import { verifyUserCode } from '@/lib/totp';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function sessionResponse(user) {
  const token = signToken({ sub: user.id, email: user.email, name: user.name, tv: user.tokenVersion });
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

async function registerFailure(user) {
  const attempts = (user.failedLoginAttempts || 0) + 1;
  const data = { failedLoginAttempts: attempts };
  if (attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    data.failedLoginAttempts = 0;
  }
  await prisma.user.update({ where: { id: user.id }, data });
  return data;
}

function lockedResponse(user) {
  const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
  return NextResponse.json(
    { error: `로그인 시도가 너무 많아 잠시 잠겼어요. ${minutesLeft}분 후 다시 시도해주세요.` },
    { status: 429 }
  );
}

export async function POST(req) {
  const { email, password, totp, ticket, captchaToken } = await req.json();

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`login-ip:${ip}`, { max: 40, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: '로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  // ─── 2단계: 비밀번호 확인 후 받은 "임시 티켓" + 인증 앱 코드로 로그인 마무리 ───
  if (ticket) {
    const payload = verifyToken(ticket);
    if (!payload || payload.purpose !== 'login2fa') {
      return NextResponse.json({ error: '인증 시간이 지났어요. 처음부터 다시 로그인해주세요.', restart: true }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user || user.deletedAt || !user.totpEnabled) {
      return NextResponse.json({ error: '처음부터 다시 로그인해주세요.', restart: true }, { status: 401 });
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return lockedResponse(user);

    const verified = verifyUserCode(user, totp);
    if (!verified) {
      const data = await registerFailure(user);
      if (data.lockedUntil) {
        return NextResponse.json({ error: `인증에 ${MAX_ATTEMPTS}회 실패해서 ${LOCK_MINUTES}분간 잠겼어요.`, restart: true }, { status: 429 });
      }
      return NextResponse.json({ needTotp: true, error: '인증 코드가 맞지 않아요. 앱의 최신 코드를 입력해주세요.' }, { status: 401 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, totpLastStep: verified.step },
    });
    return sessionResponse(user);
  }

  // ─── 1단계: 캡차 + 이메일/비밀번호 ───
  const captcha = await verifyTurnstile(captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: '사람인지 확인하는 단계를 통과하지 못했어요. 새로고침 후 다시 시도해주세요.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // 계정 존재 여부를 노출하지 않기 위해, 없는 계정도 있는 계정과 같은 오류 메시지를 씀
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return lockedResponse(user);

  const ok = await verifyPassword(password, user.passwordHash);

  if (!ok) {
    const data = await registerFailure(user);
    if (data.lockedUntil) {
      return NextResponse.json(
        { error: `비밀번호를 ${MAX_ATTEMPTS}회 틀려서 ${LOCK_MINUTES}분간 잠겼어요. 잠시 후 다시 시도해주세요.` },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  // 2단계 인증이 켜진 계정: 비밀번호가 맞으면 5분짜리 티켓을 주고, 인증 앱 코드를 요구함
  if (user.totpEnabled) {
    const newTicket = signShortToken({ uid: user.id, purpose: 'login2fa' }, '5m');
    return NextResponse.json(
      { needTotp: true, ticket: newTicket, error: '인증 앱의 6자리 코드를 입력해주세요.' },
      { status: 401 }
    );
  }

  // 로그인 성공 시 실패 카운트 초기화
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }
  return sessionResponse(user);
}
