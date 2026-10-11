'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';

export default function CheckoutPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) setOrder((await res.json()).order);
      else setError('주문 정보를 불러오지 못했어요.');
    })();
  }, [orderId]);

  useEffect(() => {
    if (!sdkReady || !order) return;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      setError('결제 기능이 아직 설정되지 않았어요 (TOSS_CLIENT_KEY 없음). 판매자에게 문의해주세요.');
      return;
    }
    const tossPayments = window.TossPayments(clientKey);
    const origin = window.location.origin;

    tossPayments
      .requestPayment('카드', {
        amount: order.amount,
        orderId: order.id,
        orderName: order.orderName || '공구온 결제',
        customerName: order.buyerName || '구매자',
        successUrl: `${origin}/checkout-result?status=success`,
        failUrl: `${origin}/checkout-result?status=fail`,
      })
      .catch((err) => {
        setError(err?.message || '결제창을 여는 데 실패했어요.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, order]);

  return (
    <div className="page">
      <Script src="https://js.tosspayments.com/v1/payment" onLoad={() => setSdkReady(true)} />
      <div className="card" style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center' }}>
        <h2 style={{ marginTop: 0 }}>결제창을 여는 중…</h2>
        {order && <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>결제 금액: {order.amount.toLocaleString()}원</p>}
        {error && (
          <>
            <p className="error-text">{error}</p>
            <button className="btn btn-ghost" onClick={() => router.back()}>돌아가기</button>
          </>
        )}
      </div>
    </div>
  );
}
