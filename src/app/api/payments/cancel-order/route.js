import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { orderId } = await req.json();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ ok: true }); // 이미 없으면 성공 취급
  if (order.buyerId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (order.paymentStatus !== 'PENDING' || order.paymentMethod !== 'CARD') {
    return NextResponse.json({ error: '취소할 수 없는 주문이에요.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.eventOption.update({
      where: { id: order.optionId },
      data: { soldCount: { decrement: order.quantity } },
    }),
    ...(order.pointsUsed > 0
      ? [prisma.user.update({ where: { id: order.buyerId }, data: { pointBalance: { increment: order.pointsUsed } } })]
      : []),
    prisma.order.delete({ where: { id: orderId } }),
  ]);

  return NextResponse.json({ ok: true });
}
