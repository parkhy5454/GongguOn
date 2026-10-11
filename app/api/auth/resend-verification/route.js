import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (user.emailVerifiedAt) return NextResponse.json({ error: '이미 인증된 이메일이에요.' }, { status: 400 });

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) },
  });

  const origin = req.headers.get('origin') || '';
  const verifyUrl = `${origin}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: '[공구온] 이메일 인증을 완료해주세요',
    html: `<p>아래 버튼을 눌러 이메일 인증을 완료해주세요.</p><p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#d1622b;color:#fff;border-radius:8px;text-decoration:none;">이메일 인증하기</a></p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
