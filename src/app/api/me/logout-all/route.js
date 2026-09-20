import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // tokenVersion을 올리면 이 계정으로 발급된 모든 토큰(다른 기기 포함, 이 요청의 토큰도)이 즉시 무효화됨
  await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}
