import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, COOKIE_NAME } from '@/lib/auth';
import { generateUniqueReferralCode } from '@/lib/referral';

export async function POST(req) {
  const { email, password, name, phone, ref, agreed } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: '이름, 이메일, 비밀번호를 모두 입력해주세요.' }, { status: 400 });
  }
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: '휴대폰 번호를 입력해주세요.' }, { status: 400 });
  }
  if (!agreed) {
    return NextResponse.json({ error: '이용약관 및 개인정보처리방침에 동의해주세요.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 400 });
  }

  let referrer = null;
  if (ref && typeof ref === 'string') {
    referrer = await prisma.user.findUnique({ where: { referralCode: ref.trim().toUpperCase() } });
  }

  const passwordHash = await hashPassword(password);
  const referralCode = await generateUniqueReferralCode();

  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone: phone || null,
      passwordHash,
      referralCode,
      referredById: referrer ? referrer.id : null,
      agreedAt: new Date(),
      // 포인트는 가입 시점이 아니라, 첫 구매 확정 또는 첫 공구 개설 시점에 양쪽에 지급됩니다.
    },
  });

  const token = signToken({ sub: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
