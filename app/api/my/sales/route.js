import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

// 판매자 본인의 매출·정산 현황
//  - 정산 금액 = 구매자가 낸 금액 + 쿠폰 할인액 (쿠폰은 공구온이 부담하는 프로모션이라 판매자에게는 정가 기준으로 정산)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { hostId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, status: true, createdAt: true,
      orders: { select: { amount: true, couponDiscount: true, paymentStatus: true, settledAt: true } },
    },
  });

  const sales = (o) => o.amount + (o.couponDiscount || 0);
  const perEvent = events.map((e) => {
    const confirmed = e.orders.filter((o) => o.paymentStatus === 'CONFIRMED');
    return {
      id: e.id, title: e.title, status: e.status, createdAt: e.createdAt,
      orderCount: e.orders.length,
      confirmedCount: confirmed.length,
      confirmedAmount: confirmed.reduce((s, o) => s + sales(o), 0),
      settledAmount: confirmed.filter((o) => o.settledAt).reduce((s, o) => s + sales(o), 0),
      unsettledAmount: confirmed.filter((o) => !o.settledAt).reduce((s, o) => s + sales(o), 0),
      pendingAmount: e.orders.filter((o) => ['PENDING', 'PAID'].includes(o.paymentStatus)).reduce((s, o) => s + sales(o), 0),
      refundedCount: e.orders.filter((o) => o.paymentStatus === 'REFUNDED').length,
    };
  });

  const total = perEvent.reduce(
    (t, e) => ({
      confirmedAmount: t.confirmedAmount + e.confirmedAmount,
      settledAmount: t.settledAmount + e.settledAmount,
      unsettledAmount: t.unsettledAmount + e.unsettledAmount,
      pendingAmount: t.pendingAmount + e.pendingAmount,
      refundedCount: t.refundedCount + e.refundedCount,
    }),
    { confirmedAmount: 0, settledAmount: 0, unsettledAmount: 0, pendingAmount: 0, refundedCount: 0 }
  );

  return NextResponse.json({ total, events: perEvent });
}
