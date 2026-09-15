import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const messages = await prisma.message.findMany({
    where: { channelId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true } },
      attachments: true,
      todo: true,
    },
    take: 200,
  });

  // 채널 멤버 자동 등록 (조회 시점에 없으면 추가)
  await prisma.channelMember.upsert({
    where: { userId_channelId: { userId: user.id, channelId: params.id } },
    update: {},
    create: { userId: user.id, channelId: params.id },
  });

  return NextResponse.json({ messages });
}

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { content, parentId, attachment } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: '메시지 내용을 입력해주세요.' }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      channelId: params.id,
      authorId: user.id,
      parentId: parentId || null,
      attachments: attachment
        ? { create: [{ filename: attachment.filename, url: attachment.url, size: attachment.size }] }
        : undefined,
    },
    include: {
      author: { select: { id: true, name: true } },
      attachments: true,
      todo: true,
    },
  });

  const io = global.__io;
  if (io) {
    io.to(`channel:${params.id}`).emit('new-message', message);
  }

  return NextResponse.json({ message });
}
