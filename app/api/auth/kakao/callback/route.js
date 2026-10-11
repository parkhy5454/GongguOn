import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrigin } from '@/lib/appOrigin';
import { verifyToken, signShortToken } from '@/lib/auth';
import { kakaoEnabled, exchangeCode, fetchProfile } from '@/lib/kakao';
import { attachSession } from '@/lib/session';
import { isAdminEmail } from '@/lib/admin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

function back(origin, path) {
  const res = NextResponse.redirect(new URL(path, origin));
  res.cookies.set('kakao_ctx', '', { path: '/', maxAge: 0 });
  return res;
}

export async function GET(req) {
  const origin = getOrigin(req);
  if (!kakaoEnabled()) return back(origin, '/login?error=kakao_off');

  const rl = await checkRateLimit(`kakao-cb:${getClientIp(req)}`, { max: 30, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) return back(origin, '/login?error=too_many');

  const sp = new URL(req.url).searchParams;
  if (sp.get('error')) return back(origin, '/login?error=kakao_cancel');

  // CSRF 방지: 시작할 때 심어둔 state와 돌아온 state가 같아야 함
  const ctxCookie = req.cookies.get('kakao_ctx')?.value;
  const ctx = ctxCookie ? verifyToken(ctxCookie) : null;
  if (!ctx || !sp.get('state') || ctx.state !== sp.get('state') || !sp.get('code')) {
    return back(origin, '/login?error=kakao_state');
  }

  const redirectUri = `${origin}/api/auth/kakao/callback`;
  const tokenRes = await exchangeCode({ code: sp.get('code'), redirectUri });
  if (tokenRes.error) return back(origin, '/login?error=kakao_fail');
  const prof = await fetchProfile(tokenRes.accessToken);
  if (prof.error) return back(origin, '/login?error=kakao_fail');
  const p = prof.profile;

  const goNext = (user) => attachSession(back(origin, ctx.next || '/events'), user);

  // 1) 이미 카카오로 가입/연결된 회원
  let user = await prisma.user.findUnique({ where: { kakaoId: p.kakaoId } });
  if (user) {
    if (user.deletedAt) return back(origin, '/login?error=deleted');
    if (user.totpEnabled) return back(origin, '/login?error=use_password'); // 2단계 인증 계정은 비밀번호 로그인만
    return goNext(user);
  }

  // 2) 카카오가 "인증된 이메일"을 알려줬고, 같은 이메일의 기존 회원이 있으면 계정 연결 (관리자·2단계 인증 계정은 제외)
  if (p.email && p.emailVerified) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });
    if (existing && !existing.deletedAt) {
      if (isAdminEmail(existing.email) || existing.totpEnabled) return back(origin, '/login?error=use_password');
      user = await prisma.user.update({ where: { id: existing.id }, data: { kakaoId: p.kakaoId } });
      return goNext(user);
    }
  }

  // 3) 신규: 전화번호·약관 동의를 받는 가입 완료 화면으로 (15분 안에 완료해야 함)
  const pending = signShortToken(
    {
      purpose: 'kakao_signup',
      kakaoId: p.kakaoId,
      name: p.nickname,
      email: p.emailVerified ? p.email : null,
      ref: ctx.ref || '',
      next: ctx.next || '/events',
    },
    '15m'
  );
  const res = back(origin, '/register/kakao');
  res.cookies.set('kakao_pending', pending, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 900,
  });
  return res;
}
