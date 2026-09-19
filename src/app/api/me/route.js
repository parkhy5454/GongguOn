import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const agg = await prisma.review.aggregate({
    where: { targetId: user.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return NextResponse.json({
    user: {
      id: user.id, name: user.name, email: user.email,
      rating: agg._avg.rating || null,
      reviewCount: agg._count.rating,
      referralCode: user.referralCode,
      pointBalance: user.pointBalance,
    },
  });
}
