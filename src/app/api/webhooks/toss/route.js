import { NextResponse } from 'next/server';
import { getTossPayment } from '@/lib/toss';
import { finalizeOrderConfirmed, finalizeOrderRefunded } from '@/lib/paymentReconcile';

// 토스페이먼츠 웹훅 수신 엔드포인트.
//
// 왜 필요한가: 결제 승인 직후 구매자의 인터넷이 끊기거나 앱이 강제 종료되면,
// 토스에서는 결제가 승인됐는데 우리 서버(브라우저를 통한 /api/payments/confirm 호출)는
// 그 사실을 영영 모르게 되는 상황이 생길 수 있어요. 웹훅은 그런 경우에도
// 토스가 서버 대 서버로 직접 알려주는 "보험" 역할을 합니다.
//
// 보안: PAYMENT_STATUS_CHANGED 웹훅은 토스 정책상 서명 헤더가 없어서,
// 웹훅 내용(payload)을 그대로 신뢰하지 않고 paymentKey로 토스에 재조회해서
// 실제 결제 상태를 직접 확인한 뒤에만 우리 DB를 반영합니다.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const paymentKey = body?.data?.paymentKey;
  const orderId = body?.data?.orderId;

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
    await finalizeOrderConfirmed(orderId, { tossPaymentKey: paymentKey }).catch(() => {});
  } else if (['CANCELED', 'PARTIAL_CANCELED'].includes(payment.status)) {
    await finalizeOrderRefunded(orderId, '토스 웹훅으로 확인된 결제 취소').catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
