import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (user.id === params.id) return NextResponse.json({ error: '본인은 팔로우할 수 없어요.' }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_sellerId: { followerId: user.id, sellerId: params.id } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({ data: { followerId: user.id, sellerId: params.id } });
  return NextResponse.json({ following: true });
}
