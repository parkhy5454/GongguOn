import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, COOKIE_NAME } from '@/lib/auth';
import { generateUniqueReferralCode } from '@/lib/referral';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

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
  const existingPhone = await prisma.user.findUnique({ where: { phone: phone.trim() } });
  if (existingPhone) {
    return NextResponse.json({ error: '이미 가입에 사용된 휴대폰 번호예요. (한 번호당 한 계정만 가능해요)' }, { status: 400 });
  }

  let referrer = null;
  if (ref && typeof ref === 'string') {
    referrer = await prisma.user.findUnique({ where: { referralCode: ref.trim().toUpperCase() } });
  }

  const passwordHash = await hashPassword(password);
  const referralCode = await generateUniqueReferralCode();

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        name,
        phone: phone.trim(),
        passwordHash,
        referralCode,
        referredById: referrer ? referrer.id : null,
        agreedAt: new Date(),
        // 포인트는 가입 시점이 아니라, 첫 구매 확정 또는 첫 공구 개설 시점에 양쪽에 지급됩니다.
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: '이미 가입된 이메일 또는 휴대폰 번호예요.' }, { status: 400 });
    }
    throw err;
  }

  // 이메일 인증 메일 발송 (실패해도 가입 자체는 막지 않음 — Resend 키 없으면 조용히 스킵됨)
  const verifyToken = crypto.randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token: verifyToken, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) },
  });
  const origin = req.headers.get('origin') || '';
  const verifyUrl = `${origin}/verify-email?token=${verifyToken}`;
  await sendEmail({
    to: user.email,
    subject: '[공구온] 이메일 인증을 완료해주세요',
    html: `
      <p>안녕하세요, ${user.name}님. 공구온 가입을 환영해요!</p>
      <p>아래 버튼을 눌러 이메일 인증을 완료해주세요.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#d1622b;color:#fff;border-radius:8px;text-decoration:none;">이메일 인증하기</a></p>
      <p>버튼이 안 눌리면 아래 링크를 브라우저에 붙여넣어주세요:<br>${verifyUrl}</p>
    `,
  }).catch(() => {});

  const token = signToken({ sub: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
