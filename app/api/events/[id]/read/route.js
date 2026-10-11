import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await prisma.chatRead.upsert({
    where: { userId_eventId: { userId: user.id, eventId: params.id } },
    update: { lastReadAt: new Date() },
    create: { userId: user.id, eventId: params.id },
  });

  return NextResponse.json({ ok: true });
}
