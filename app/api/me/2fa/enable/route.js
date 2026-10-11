import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin';
import { verifyUserCode } from '@/lib/totp';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const rl = await checkRateLimit(`2fa-enable:${user.id}`, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: '시도가 너무 많아요. 잠시 후 다시 해주세요.' }, { status: 429 });

  const { code } = await req.json();
  if (!user.totpSecret || user.totpEnabled) {
    return NextResponse.json({ error: '먼저 설정을 시작해주세요.' }, { status: 400 });
  }
  const ok = verifyUserCode(user, code);
  if (!ok) return NextResponse.json({ error: '코드가 맞지 않아요. 앱에 표시된 6자리 숫자를 다시 확인해주세요.' }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, totpLastStep: ok.step },
  });
  return NextResponse.json({ ok: true });
}
