'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus('error');
        setError('링크가 올바르지 않아요.');
        return;
      }
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await res.json();
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setError(d.error || '인증에 실패했어요.');
      }
    })();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && <h1>인증 확인 중…</h1>}
        {status === 'success' && (
          <>
            <h1>✅ 이메일 인증 완료</h1>
            <p className="sub">이제 공구온의 모든 기능을 이용하실 수 있어요.</p>
            <Link href="/events" className="btn btn-primary btn-block">공구온으로 이동</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>인증에 실패했어요</h1>
            <p className="sub">{error}</p>
            <Link href="/events" className="btn btn-ghost btn-block">공구온으로 이동</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
