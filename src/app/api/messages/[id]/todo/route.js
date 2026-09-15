import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { dueDate } = await req.json().catch(() => ({}));

  const todo = await prisma.todo.create({
    data: {
      title: message.content.slice(0, 140),
      channelId: message.channelId,
      messageId: message.id,
      creatorId: user.id,
      assigneeId: user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: { assignee: true, creator: true },
  });

  const io = global.__io;
  if (io) io.to(`channel:${message.channelId}`).emit('todo-created', todo);

  return NextResponse.json({ todo });
}
