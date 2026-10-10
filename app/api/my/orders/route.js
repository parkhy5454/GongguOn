import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { id: true, title: true, status: true, deliveryStatus: true, images: true } },
      option: true,
    },
  });

  return NextResponse.json({ orders });
}
