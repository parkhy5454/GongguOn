import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getTossPayment } from '@/lib/toss';
import { finalizeOrderConfirmed, finalizeOrderRefunded, releasePendingOrder, notifyHostPaid } from '@/lib/paymentReconcile';

// 토스페이먼츠 웹훅 수신 엔드포인트.
//
// 왜 필요한가:
//  1) 카드: 결제 승인 직후 구매자의 인터넷이 끊기거나 앱이 강제 종료되면, 토스에서는 승인됐는데
//     우리 서버는 모르는 상황이 생길 수 있어요. 웹훅은 토스가 서버 대 서버로 직접 알려주는 "보험"입니다.
//  2) 가상계좌: 구매자가 계좌로 입금하면 토스가 이 주소로 알려줘요 (입금 자동 확인).
//     입금 기한이 지나 만료되면 잡아둔 재고를 풀어줍니다.
//
// 보안: 웹훅 내용(payload)을 그대로 믿지 않고, 항상 토스에 결제를 다시 조회해서
// 실제 상태를 직접 확인한 뒤에만 우리 DB를 반영합니다. (가상계좌 입금 알림은 추가로 secret 값도 대조)
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  let paymentKey = body?.data?.paymentKey;
  let orderId = body?.data?.orderId;

  // 가상계좌 입금 알림(DEPOSIT_CALLBACK): paymentKey 없이 orderId + secret이 옴
  if (!paymentKey && body?.orderId && body?.secret) {
    const order = await prisma.order.findUnique({ where: { id: String(body.orderId) } });
    if (!order || order.paymentMethod !== 'VIRTUAL_ACCOUNT' || !order.vaSecret || !order.tossPaymentKey) {
      return NextResponse.json({ ok: true }); // 우리 주문이 아니거나 이미 정리됨 — 재전송 방지용 2xx
    }
    const a = Buffer.from(String(body.secret));
    const b = Buffer.from(order.vaSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ error: 'invalid secret' }, { status: 400 });
    }
    paymentKey = order.tossPaymentKey;
    orderId = order.id;
  }

  if (!paymentKey || !orderId) {
    // 우리가 처리하지 않는 이벤트 종류일 수 있음 (payout.changed 등) — 2xx로 응답해 재전송을 막음
    return NextResponse.json({ ok: true });
  }

  // 웹훅 payload를 곧이곧대로 믿지 않고, 토스에 다시 물어봐서 진짜 상태를 확인
  const { payment, error } = await getTossPayment(paymentKey);
  if (error || !payment) {
    // 일시적 오류일 수 있으니 5xx로 응답해 토스가 재시도하도록 함
    return NextResponse.json({ error: error || 'lookup failed' }, { status: 502 });
  }

  if (payment.orderId !== orderId) {
    return NextResponse.json({ error: 'order mismatch' }, { status: 400 });
  }

  if (payment.status === 'DONE') {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true, buyer: { select: { name: true } } } });
    const updated = await finalizeOrderConfirmed(orderId, { tossPaymentKey: paymentKey }).catch(() => null);
    // 가상계좌는 입금이 확인되는 이 시점에 판매자에게 알림 (카드는 결제 승인 시점에 이미 알림)
    if (updated && order?.paymentMethod === 'VIRTUAL_ACCOUNT') {
      await notifyHostPaid(order, order.buyer?.name, '가상계좌').catch(() => {});
    }
  } else if (['CANCELED', 'PARTIAL_CANCELED'].includes(payment.status)) {
    // 대기 중(입금 전)에 취소된 경우는 주문을 풀고, 이미 결제된 건은 환불 처리
    const released = await releasePendingOrder(orderId).catch(() => false);
    if (!released) await finalizeOrderRefunded(orderId, '토스 웹훅으로 확인된 결제 취소').catch(() => {});
  } else if (['EXPIRED', 'ABORTED'].includes(payment.status)) {
    // 가상계좌 입금 기한 만료 등 → 입금 전 주문이므로 재고/포인트/쿠폰을 풀어줌
    await releasePendingOrder(orderId).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
