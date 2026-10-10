import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const channel = await prisma.channel.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: user.id, channelId: params.id } },
  });

  if (channel.isPrivate && !membership) {
    return NextResponse.json({ error: '비공개 채널입니다. 초대받은 사람만 볼 수 있어요.' }, { status: 403 });
  }

  // 공개 채널은 조회 시점에 자동으로 멤버 등록 (비공개 채널은 초대를 통해서만 등록)
  if (!channel.isPrivate && !membership) {
    await prisma.channelMember.create({ data: { userId: user.id, channelId: params.id } });
  }

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

  return NextResponse.json({ messages });
}

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const channel = await prisma.channel.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: user.id, channelId: params.id } },
  });
  if (channel.isPrivate && !membership) {
    return NextResponse.json({ error: '비공개 채널입니다. 초대받은 사람만 쓸 수 있어요.' }, { status: 403 });
  }
  if (!channel.isPrivate && !membership) {
    await prisma.channelMember.create({ data: { userId: user.id, channelId: params.id } });
  }

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
