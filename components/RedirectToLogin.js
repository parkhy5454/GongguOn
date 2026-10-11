'use client';
import { useEffect } from 'react';

export default function RedirectToLogin() {
  useEffect(() => {
    const next = window.location.pathname + window.location.search;
    window.location.replace('/login?next=' + encodeURIComponent(next));
  }, []);
  return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>로그인 페이지로 이동 중...</div>;
}
