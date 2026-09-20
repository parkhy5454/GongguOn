import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { cancelTossPayment } from '@/lib/toss';
import { finalizeOrderRefunded } from '@/lib/paymentReconcile';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { event: true } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.event.hostId !== user.id) {
    return NextResponse.json({ error: '공구 개설자만 환불 처리할 수 있어요.' }, { status: 403 });
  }
  if (!['PAID', 'CONFIRMED'].includes(order.paymentStatus)) {
    return NextResponse.json({ error: '환불할 수 없는 주문 상태예요.' }, { status: 400 });
  }

  const { reason } = await req.json().catch(() => ({}));
  const cancelReason = reason?.trim() || '판매자 요청에 의한 환불';

  // 카드 결제는 토스에 실제 결제 취소를 요청, 계좌이체는 장부상으로만 환불 처리
  if (order.paymentMethod === 'CARD' && order.tossPaymentKey) {
    const { error } = await cancelTossPayment({ paymentKey: order.tossPaymentKey, cancelReason });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }

  await finalizeOrderRefunded(params.id, cancelReason);

  return NextResponse.json({ ok: true });
}
