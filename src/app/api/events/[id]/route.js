import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, name: true, email: true } },
      options: true,
      reviews: {
        include: { reviewer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const isHost = event.hostId === user.id;

  const ratingAgg = await prisma.review.aggregate({
    where: { targetId: event.hostId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const myOrder = await prisma.order.findFirst({
    where: { eventId: params.id, buyerId: user.id },
    include: { option: true },
    orderBy: { createdAt: 'desc' },
  });

  let orders = [];
  if (isHost) {
    orders = await prisma.order.findMany({
      where: { eventId: params.id },
      include: { buyer: { select: { id: true, name: true, email: true } }, option: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  const totalParticipants = isHost
    ? new Set(orders.map((o) => o.buyerId)).size
    : undefined;

  return NextResponse.json({
    event,
    hostRating: { avg: ratingAgg._avg.rating, count: ratingAgg._count.rating },
    isHost,
    myOrder,
    orders,
    totalParticipants,
  });
}
