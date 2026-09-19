import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { getOrCreateAIUser, generateAIReply } from '@/lib/aiAssistant';

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

  const { content, imageUrl } = await req.json();
  if ((!content || !content.trim()) && !imageUrl) {
    return NextResponse.json({ error: '메시지 내용을 입력해주세요.' }, { status: 400 });
  }

  const message = await prisma.eventMessage.create({
    data: { eventId: params.id, authorId: user.id, content: content?.trim() || '', imageUrl: imageUrl || null },
    include: { author: { select: { id: true, name: true } } },
  });

  const io = global.__io;
  if (io) io.to(`event:${params.id}`).emit('new-message', message);

  // AI 자동응답: 호스트가 켜둔 경우, 구매자(호스트가 아닌 사람)의 질문에 자동으로 답변
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { options: true } });
  if (event?.aiAutoReply && event.hostId !== user.id && content?.trim()) {
    const aiUser = await getOrCreateAIUser();
    if (user.id !== aiUser.id) {
      const replyText = await generateAIReply(event, content.trim());
      if (replyText) {
        const aiMessage = await prisma.eventMessage.create({
          data: { eventId: params.id, authorId: aiUser.id, content: replyText },
          include: { author: { select: { id: true, name: true } } },
        });
        if (io) io.to(`event:${params.id}`).emit('new-message', aiMessage);
      }
    }
  }

  return NextResponse.json({ message });
}
