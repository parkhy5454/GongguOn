'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CheckoutResultInner() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status');
  const orderId = params.get('orderId');
  const paymentKey = params.get('paymentKey');
  const amount = params.get('amount');
  const message = params.get('message');

  const [state, setState] = useState('processing'); // processing | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [eventId, setEventId] = useState(null);
  const [va, setVa] = useState(null);

  useEffect(() => {
    (async () => {
      if (status === 'success' && orderId && paymentKey && amount) {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, paymentKey, amount: Number(amount) }),
        });
        const d = await res.json();
        if (res.ok) {
          setState('success');
          setEventId(d.order?.eventId || null);
          if (d.virtualAccount) setVa({ ...d.virtualAccount, amount: d.order?.amount });
        } else {
          setState('error');
          setErrorMsg(d.error || '결제 확인에 실패했어요.');
        }
      } else {
        // 결제 실패/취소 → 임시 주문 정리
        if (orderId) {
          await fetch('/api/payments/cancel-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          }).catch(() => {});
        }
        setState('error');
        setErrorMsg(message || '결제가 취소되었거나 실패했어요.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center' }}>
        {state === 'processing' && <h2>결제 확인 중…</h2>}
        {state === 'success' && (
          <>
            {va ? (
              <>
                <h2>🏦 가상계좌가 발급됐어요</h2>
                <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 14, textAlign: 'left', fontSize: 14, lineHeight: 1.8 }}>
                  <div>은행: <b>{va.bank}</b></div>
                  <div>계좌번호: <b>{va.accountNumber}</b></div>
                  {va.amount != null && <div>입금액: <b>{Number(va.amount).toLocaleString()}원</b></div>}
                  {va.dueDate && <div>입금기한: <b>{new Date(va.dueDate).toLocaleString('ko-KR')}</b></div>}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                  기한 안에 정확한 금액을 입금하면 자동으로 확인돼요. 기한이 지나면 주문은 자동 취소됩니다.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ color: 'var(--success)' }}>✅ 결제가 완료됐어요</h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>주문이 정상적으로 처리됐습니다.</p>
              </>
            )}
            {eventId && (
              <button className="btn btn-primary" onClick={() => router.push(`/events/${eventId}`)}>공구로 돌아가기</button>
            )}
          </>
        )}
        {state === 'error' && (
          <>
            <h2 style={{ color: 'var(--danger)' }}>결제가 완료되지 않았어요</h2>
            <p className="error-text">{errorMsg}</p>
            <Link href="/events" className="btn btn-ghost">공구 목록으로</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutResultInner />
    </Suspense>
  );
}
