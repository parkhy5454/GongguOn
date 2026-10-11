import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: '토큰이 필요해요.' }, { status: 400 });

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json({ error: '유효하지 않거나 만료된 링크예요. 다시 요청해주세요.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
