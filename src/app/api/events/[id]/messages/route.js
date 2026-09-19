import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const messages = await prisma.eventMessage.findMany({
    where: { eventId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true } } },
    take: 200,
  });

  return NextResponse.json({ messages });
}

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { content } = await req.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '메시지 내용을 입력해주세요.' }, { status: 400 });
  }

  const message = await prisma.eventMessage.create({
    data: { eventId: params.id, authorId: user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true } } },
  });

  const io = global.__io;
  if (io) io.to(`event:${params.id}`).emit('new-message', message);

  return NextResponse.json({ message });
}
