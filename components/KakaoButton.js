'use client';

import { useEffect, useState } from 'react';

// "카카오로 시작하기" 버튼. 서버에 카카오 키가 설정돼 있을 때만 보여요.
export default function KakaoButton({ next, refCode, label = '카카오로 3초 만에 시작하기' }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.kakao) setEnabled(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!enabled) return null;

  const qs = new URLSearchParams();
  if (next) qs.set('next', next);
  if (refCode) qs.set('ref', refCode);
  const href = `/api/auth/kakao${qs.toString() ? `?${qs.toString()}` : ''}`;

  return (
    <>
      <a
        href={href}
        className="btn btn-block"
        style={{ background: '#FEE500', color: '#191919', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
      >
        <span aria-hidden="true" style={{ fontSize: 16 }}>💬</span>
        {label}
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0', color: 'var(--text-dim)', fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        또는 이메일로
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
    </>
  );
}
