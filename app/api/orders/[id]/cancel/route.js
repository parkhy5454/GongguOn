import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { notify } from '@/lib/notify';
import { releasePendingOrder, finalizeOrderRefunded, cancelPaymentAtToss } from '@/lib/paymentReconcile';

// 구매자가 직접 참여를 취소 (마감 전까지)
//  - 결제 전(대기) 주문: 재고·포인트·쿠폰을 풀고 주문 삭제 (가상계좌는 발급된 계좌도 무효화)
//  - 카드 결제 완료 주문: 배송 시작 전이면 바로 결제 취소(환불)
//  - 계좌이체로 "입금완료"를 표시했거나 가상계좌로 입금한 주문은 판매자에게 환불을 요청해야 해요
export async function POST(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { event: true } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.buyerId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const event = order.event;
  if (event.status !== 'OPEN' || new Date(event.deadline) < new Date()) {
    return NextResponse.json({ error: '마감된 공구는 직접 취소할 수 없어요. 판매자에게 문의해주세요.' }, { status: 400 });
  }
  if (order.trackingNumber) {
    return NextResponse.json({ error: '이미 배송이 시작된 주문은 직접 취소할 수 없어요.' }, { status: 400 });
  }

  if (order.paymentStatus === 'PENDING') {
    // 발급된 가상계좌가 있으면 토스에서 먼저 무효화 (입금되는 사고 방지)
    if (order.paymentMethod === 'VIRTUAL_ACCOUNT' && order.tossPaymentKey) {
      const { error } = await cancelPaymentAtToss(order, '구매자가 참여를 취소했어요.');
      if (error) return NextResponse.json({ error }, { status: 400 });
    }
    const ok = await releasePendingOrder(order.id);
    if (!ok) return NextResponse.json({ error: '이미 처리된 주문이에요. 새로고침해주세요.' }, { status: 409 });
  } else if (order.paymentStatus === 'CONFIRMED' && order.paymentMethod === 'CARD') {
    const { error } = await cancelPaymentAtToss(order, '구매자가 마감 전에 참여를 취소했어요.');
    if (error) return NextResponse.json({ error }, { status: 400 });
    await finalizeOrderRefunded(order.id, '구매자 직접 취소');
  } else {
    return NextResponse.json(
      { error: '입금이 진행된 주문은 직접 취소할 수 없어요. 공구 채팅으로 판매자에게 환불을 요청해주세요.' },
      { status: 400 }
    );
  }

  await notify(event.hostId, {
    type: 'order_cancelled',
    title: '참여자가 취소했어요',
    body: `"${event.title}"에서 ${user.name}님이 참여를 취소했어요.`,
    url: `/events/${event.id}`,
  });

  const io = global.__io;
  if (io) io.to(`event:${event.id}`).emit('order-updated', { eventId: event.id });

  return NextResponse.json({ ok: true });
}
