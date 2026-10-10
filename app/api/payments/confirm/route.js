import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { confirmTossPayment } from '@/lib/toss';
import { finalizeOrderConfirmed } from '@/lib/paymentReconcile';
import { notify } from '@/lib/notify';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { orderId, paymentKey, amount } = await req.json();
  if (!orderId || !paymentKey || !amount) {
    return NextResponse.json({ error: '결제 정보가 올바르지 않아요.' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true } });
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없어요.' }, { status: 404 });
  if (order.buyerId !== user.id) return NextResponse.json({ error: '본인 주문만 결제할 수 있어요.' }, { status: 403 });
  if (order.paymentStatus === 'CONFIRMED') {
    return NextResponse.json({ order }); // 이미 처리된 결제(중복 콜백 또는 웹훅이 먼저 처리)면 그대로 성공 응답
  }
  if (Number(amount) !== order.amount) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않아요.' }, { status: 400 });
  }

  const { payment, error } = await confirmTossPayment({ paymentKey, orderId, amount: Number(amount) });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const updated = await finalizeOrderConfirmed(orderId, { tossPaymentKey: payment.paymentKey });

  await notify(order.event.hostId, {
    type: 'new_order',
    title: '카드 결제가 완료됐어요',
    body: `"${order.event.title}"에 ${user.name}님이 카드로 결제 완료했어요.`,
    url: `/events/${order.eventId}`,
  });

  return NextResponse.json({ order: updated || order });
}
