import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.buyerId !== user.id) {
    return NextResponse.json({ error: '본인 주문만 입금 표시할 수 있어요.' }, { status: 403 });
  }

  const { depositorName } = await req.json();
  if (!depositorName || !depositorName.trim()) {
    return NextResponse.json({ error: '입금자명을 입력해주세요.' }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { depositorName: depositorName.trim(), paymentStatus: 'PAID' },
    include: { option: true, buyer: { select: { id: true, name: true } } },
  });

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', updated);

  return NextResponse.json({ order: updated });
}
