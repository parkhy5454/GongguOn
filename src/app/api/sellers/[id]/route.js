import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const seller = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, createdAt: true },
  });
  if (!seller) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const events = await prisma.event.findMany({
    where: { hostId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { options: true },
  });

  const ratingAgg = await prisma.review.aggregate({
    where: { targetId: params.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const reviews = await prisma.review.findMany({
    where: { targetId: params.id },
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    seller,
    events,
    rating: { avg: ratingAgg._avg.rating, count: ratingAgg._count.rating },
    reviews,
  });
}
