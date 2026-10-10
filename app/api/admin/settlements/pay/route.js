import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { notify } from '@/lib/notify';
import { logAdminAction } from '@/lib/adminLog';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { sellerId } = await req.json();
  if (!sellerId) return NextResponse.json({ error: 'sellerId가 필요해요.' }, { status: 400 });

  const result = await prisma.order.updateMany({
    where: {
      paymentStatus: 'CONFIRMED',
      settledAt: null,
      event: { hostId: sellerId },
    },
    data: { settledAt: new Date() },
  });

  await logAdminAction(user.id, 'settlement_pay', `sellerId=${sellerId}, count=${result.count}`);

  await notify(sellerId, {
    type: 'settlement_paid',
    title: '정산이 완료됐어요',
    body: `${result.count}건의 주문 정산금이 지급 처리됐어요.`,
    url: '/my',
  });

  return NextResponse.json({ ok: true, count: result.count });
}
