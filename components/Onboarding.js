'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'gg_onboarding_done';

// 가입 14일 이내 회원에게만 보이는 시작 안내 카드 (닫으면 다시 안 보임)
export default function Onboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      try { if (localStorage.getItem(KEY)) return; } catch {}
      const res = await fetch('/api/me');
      if (!res.ok) return;
      const me = (await res.json()).user;
      const age = Date.now() - new Date(me.createdAt).getTime();
      if (age < 14 * 24 * 3600 * 1000) setShow(true);
    })();
  }, []);

  if (!show) return null;
  function close() {
    try { localStorage.setItem(KEY, '1'); } catch {}
    setShow(false);
  }
  const step = { flex: '1 1 160px', fontSize: 13, lineHeight: 1.6 };
  return (
    <div className="card" style={{ marginBottom: 16, background: 'var(--accent-soft)', border: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <b style={{ color: 'var(--accent)' }}>👋 공구온 시작하기</b>
        <button onClick={close} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-dim)' }}>닫기 ✕</button>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={step}><b>① 구경하고 참여</b><br />마음에 드는 공구를 골라 옵션·수량을 정하고 결제해요. 참여자가 늘수록 할인돼요.</div>
        <div style={step}><b>② 질문은 채팅으로</b><br />각 공구 페이지 오른쪽 채팅에서 판매자에게 바로 물어볼 수 있어요.</div>
        <div style={step}><b>③ 직접 열어보기</b><br />판매자라면 <Link href="/events/new" style={{ textDecoration: 'underline' }}>공구 등록</Link>에서 5분 만에 열 수 있어요.</div>
      </div>
    </div>
  );
}
