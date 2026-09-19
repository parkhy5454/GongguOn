import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { event: true } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.event.hostId !== user.id) {
    return NextResponse.json({ error: '공구 개설자만 입금을 확인할 수 있어요.' }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { paymentStatus: 'CONFIRMED' },
    include: { option: true, buyer: { select: { id: true, name: true } } },
  });

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', updated);

  return NextResponse.json({ order: updated });
}
