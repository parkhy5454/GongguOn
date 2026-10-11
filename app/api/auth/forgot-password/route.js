import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/turnstile';
import crypto from 'crypto';

export async function POST(req) {
  const { email, captchaToken } = await req.json();
  if (!email) {
    return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
  }

  const ip = getClientIp(req);
  const captcha = await verifyTurnstile(captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: '사람인지 확인하는 단계를 통과하지 못했어요. 새로고침 후 다시 시도해주세요.' }, { status: 400 });
  }
  const ipLimit = await checkRateLimit(`forgot-pw-ip:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
  const emailLimit = await checkRateLimit(`forgot-pw-email:${email}`, { max: 3, windowMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    // 특정 이메일로 계속 재설정 메일이 발송되는 괴롭힘/스팸을 막기 위해 조용히 제한 (사용자에겐 평소와 같은 성공 메시지)
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // 가입 여부를 노출하지 않기 위해, 계정이 없어도(또는 탈퇴했어도) 항상 같은 성공 메시지를 반환
  if (user && !user.deletedAt) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30분 유효

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const origin = req.headers.get('origin') || '';
    const resetUrl = `${origin}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: '[공구온] 비밀번호 재설정 안내',
      html: `
        <p>안녕하세요, ${user.name}님.</p>
        <p>아래 버튼을 눌러 새 비밀번호를 설정해주세요. 이 링크는 30분간만 유효합니다.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#d1622b;color:#fff;border-radius:8px;text-decoration:none;">비밀번호 재설정하기</a></p>
        <p>버튼이 안 눌리면 아래 링크를 브라우저에 붙여넣어주세요:<br>${resetUrl}</p>
        <p>본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.</p>
      `,
    });
  }

  return NextResponse.json({ ok: true });
}
