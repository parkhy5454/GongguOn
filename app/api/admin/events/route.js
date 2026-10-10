import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      host: { select: { name: true, email: true } },
      orders: { select: { amount: true, paymentStatus: true, buyerId: true } },
    },
  });

  const enriched = events.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    hostName: e.host.name,
    hostEmail: e.host.email,
    createdAt: e.createdAt,
    deadline: e.deadline,
    participants: new Set(e.orders.map((o) => o.buyerId)).size,
    confirmedRevenue: e.orders.filter((o) => o.paymentStatus === 'CONFIRMED').reduce((s, o) => s + o.amount, 0),
    pendingRevenue: e.orders.filter((o) => o.paymentStatus !== 'CONFIRMED').reduce((s, o) => s + o.amount, 0),
  }));

  return NextResponse.json({ events: enriched });
}
