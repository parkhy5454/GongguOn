import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const existing = await prisma.message.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const message = await prisma.message.update({
    where: { id: params.id },
    data: { isDecision: !existing.isDecision },
    include: { author: { select: { id: true, name: true } }, attachments: true, todo: true },
  });

  const io = global.__io;
  if (io) io.to(`channel:${message.channelId}`).emit('message-updated', message);

  return NextResponse.json({ message });
}
