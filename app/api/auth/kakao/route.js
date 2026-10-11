import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrigin, safeNext } from '@/lib/appOrigin';
import { signShortToken } from '@/lib/auth';
import { kakaoEnabled, buildAuthUrl } from '@/lib/kakao';

// 카카오 로그인 시작: 카카오 인증 화면으로 보냄 (?next=돌아갈경로&ref=추천코드)
export async function GET(req) {
  const origin = getOrigin(req);
  if (!kakaoEnabled()) return NextResponse.redirect(new URL('/login?error=kakao_off', origin));

  const sp = new URL(req.url).searchParams;
  const state = crypto.randomBytes(16).toString('hex');
  const ctx = signShortToken(
    { state, next: safeNext(sp.get('next')), ref: (sp.get('ref') || '').slice(0, 20) },
    '10m'
  );

  const res = NextResponse.redirect(buildAuthUrl({ redirectUri: `${origin}/api/auth/kakao/callback`, state }));
  res.cookies.set('kakao_ctx', ctx, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600,
  });
  return res;
}
