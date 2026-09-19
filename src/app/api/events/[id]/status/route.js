import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (event.hostId !== user.id) {
    return NextResponse.json({ error: '공구를 개설한 판매자만 상태를 변경할 수 있어요.' }, { status: 403 });
  }

  const body = await req.json();
  const data = {};
  if (body.status) data.status = body.status;
  if (body.deliveryStatus) data.deliveryStatus = body.deliveryStatus;

  const updated = await prisma.event.update({ where: { id: params.id }, data });

  const io = global.__io;
  if (io) io.to(`event:${params.id}`).emit('event-updated', updated);

  return NextResponse.json({ event: updated });
}
