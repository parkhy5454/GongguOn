import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { applicableDiscount } from '@/lib/pricing';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, name: true, email: true } },
      options: true,
      discountTiers: { orderBy: { minParticipants: 'asc' } },
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

  // 참여 인원(구매 주문 기준 고유 인원 수)은 동적 할인 계산을 위해 누구에게나 공개
  const allOrders = isHost ? orders : await prisma.order.findMany({ where: { eventId: params.id }, select: { buyerId: true } });
  const currentParticipants = new Set(allOrders.map((o) => o.buyerId)).size;
  const currentDiscount = applicableDiscount(event.discountTiers, currentParticipants);
  const nextTier = event.discountTiers.find((t) => t.minParticipants > currentParticipants) || null;

  const favorite = await prisma.favorite.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: params.id } },
  });

  return NextResponse.json({
    event,
    hostRating: { avg: ratingAgg._avg.rating, count: ratingAgg._count.rating },
    isHost,
    myOrder,
    orders,
    totalParticipants: isHost ? currentParticipants : undefined,
    currentParticipants,
    currentDiscount,
    nextTier,
    isFavorited: !!favorite,
  });
}
