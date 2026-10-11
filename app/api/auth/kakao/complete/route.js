import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { generateUniqueReferralCode } from '@/lib/referral';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { getOrigin, safeNext } from '@/lib/appOrigin';
import { attachSession } from '@/lib/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 카카오로 처음 오신 분의 가입 완료: 휴대폰 번호와 약관 동의를 받고 계정을 만듦
export async function POST(req) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`register:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: '너무 많은 가입 시도가 있었어요. 잠시 후 다시 시도해주세요.' }, { status: 429 });

  const c = req.cookies.get('kakao_pending')?.value;
  const pending = c ? verifyToken(c) : null;
  if (!pending || pending.purpose !== 'kakao_signup') {
    return NextResponse.json({ error: '시간이 지났어요. 카카오로 다시 시작해주세요.', restart: true }, { status: 401 });
  }

  const { name, email, phone, agreed, ageOk } = await req.json();
  if (!agreed) return NextResponse.json({ error: '이용약관 및 개인정보처리방침에 동의해주세요.' }, { status: 400 });
  if (!ageOk) return NextResponse.json({ error: '만 14세 이상만 가입할 수 있어요.' }, { status: 400 });
  const cleanName = String(name || pending.name || '').trim().slice(0, 30);
  if (!cleanName) return NextResponse.json({ error: '이름(닉네임)을 입력해주세요.' }, { status: 400 });
  if (!phone || !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(String(phone).trim())) {
    return NextResponse.json({ error: '휴대폰 번호를 올바르게 입력해주세요. (예: 010-1234-5678)' }, { status: 400 });
  }

  // 카카오가 인증해준 이메일이 있으면 그것을 쓰고, 없으면 직접 입력받음(이 경우 이메일 인증 필요)
  const verifiedEmail = pending.email || null;
  const finalEmail = (verifiedEmail || String(email || '').trim().toLowerCase());
  if (!EMAIL_RE.test(finalEmail)) return NextResponse.json({ error: '이메일을 올바르게 입력해주세요.' }, { status: 400 });

  if (await prisma.user.findUnique({ where: { email: finalEmail } })) {
    return NextResponse.json({ error: '이미 가입된 이메일이에요. 기존 계정으로 로그인해주세요.' }, { status: 400 });
  }
  if (await prisma.user.findUnique({ where: { phone: String(phone).trim() } })) {
    return NextResponse.json({ error: '이미 가입에 사용된 휴대폰 번호예요. (한 번호당 한 계정만 가능해요)' }, { status: 400 });
  }
  if (await prisma.user.findUnique({ where: { kakaoId: pending.kakaoId } })) {
    return NextResponse.json({ error: '이미 가입된 카카오 계정이에요. 카카오로 로그인해주세요.' }, { status: 400 });
  }

  let referrer = null;
  if (pending.ref) {
    referrer = await prisma.user.findUnique({ where: { referralCode: String(pending.ref).trim().toUpperCase() } });
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: finalEmail,
        name: cleanName,
        phone: String(phone).trim(),
        kakaoId: pending.kakaoId,
        // 카카오 로그인 전용 계정: 아무도 모르는 무작위 비밀번호 (나중에 '비밀번호 찾기'로 비밀번호를 만들 수 있음)
        passwordHash: await hashPassword(crypto.randomBytes(32).toString('hex')),
        referralCode: await generateUniqueReferralCode(),
        referredById: referrer ? referrer.id : null,
        agreedAt: new Date(),
        emailVerifiedAt: verifiedEmail ? new Date() : null,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') return NextResponse.json({ error: '이미 가입된 정보(이메일/휴대폰/카카오)가 있어요.' }, { status: 400 });
    throw err;
  }

  if (!verifiedEmail) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) },
    });
    const url = `${getOrigin(req)}/verify-email?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: '[공구온] 이메일 인증을 완료해주세요',
      html: `<p>안녕하세요, ${user.name}님. 공구온 가입을 환영해요!</p><p><a href="${url}">이메일 인증하기</a></p>`,
    }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true, next: safeNext(pending.next) });
  res.cookies.set('kakao_pending', '', { path: '/', maxAge: 0 });
  return attachSession(res, user);
}
