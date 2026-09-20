import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id }, select: { hostId: true } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (event.hostId === user.id) {
    return NextResponse.json({ error: '본인이 개설한 공구는 찜할 수 없어요.' }, { status: 400 });
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: params.id } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({ data: { userId: user.id, eventId: params.id } });
  return NextResponse.json({ favorited: true });
}
