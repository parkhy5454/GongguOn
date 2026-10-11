import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin';
import { generateSecret, otpauthUrl, encrypt } from '@/lib/totp';

// 새 비밀키를 만들어 "대기 상태"로 저장. 인증 앱에서 코드를 확인(enable)해야 실제로 켜집니다.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (user.totpEnabled) {
    return NextResponse.json({ error: '이미 2단계 인증이 켜져 있어요.' }, { status: 400 });
  }
  const secret = generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: encrypt(secret), totpEnabled: false, totpLastStep: null },
  });
  return NextResponse.json({ secret, otpauthUrl: otpauthUrl(user.email, secret) });
}
