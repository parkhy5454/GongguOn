import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { event: { select: { id: true, title: true, hostId: true } }, option: true, buyer: { select: { id: true, name: true } } },
  });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.buyerId !== user.id && order.event.hostId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      amount: order.amount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      orderName: `${order.event.title} · ${order.option.name}`,
      buyerName: order.buyer.name,
      eventId: order.event.id,
    },
  });
}
