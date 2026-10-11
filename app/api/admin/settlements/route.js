import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 결제 확정됐지만 아직 정산 안 된 주문들을 판매자별로 묶어서 보여줌
  const unsettled = await prisma.order.findMany({
    where: { paymentStatus: 'CONFIRMED', settledAt: null },
    include: { event: { select: { id: true, title: true, hostId: true, host: { select: { id: true, name: true, email: true } } } } },
  });

  const bySeller = {};
  for (const o of unsettled) {
    const key = o.event.hostId;
    if (!bySeller[key]) {
      bySeller[key] = { seller: o.event.host, totalAmount: 0, orderCount: 0, events: new Set() };
    }
    bySeller[key].totalAmount += o.amount;
    bySeller[key].orderCount += 1;
    bySeller[key].events.add(o.event.title);
  }

  const sellers = Object.entries(bySeller).map(([sellerId, v]) => ({
    sellerId,
    sellerName: v.seller.name,
    sellerEmail: v.seller.email,
    totalAmount: v.totalAmount,
    orderCount: v.orderCount,
    eventTitles: [...v.events],
  }));

  const settledAgg = await prisma.order.aggregate({
    where: { paymentStatus: 'CONFIRMED', settledAt: { not: null } },
    _sum: { amount: true },
    _count: true,
  });

  return NextResponse.json({
    sellers: sellers.sort((a, b) => b.totalAmount - a.totalAmount),
    settledTotal: settledAgg._sum.amount || 0,
    settledCount: settledAgg._count,
  });
}
