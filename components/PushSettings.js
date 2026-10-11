'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// 이 기기에서 푸시 알림(마감 임박, 새 참여자, 결제 확인 등)을 받을지 켜고 끄는 카드
export default function PushSettings() {
  const [state, setState] = useState('loading'); // loading | unsupported | off | on | denied | disabled | needs-install
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
        if (!supported) {
          setState(isIOS && !standalone ? 'needs-install' : 'unsupported');
          return;
        }
        const res = await fetch('/api/push/key');
        const d = res.ok ? await res.json() : null;
        if (!d?.enabled) { setState('disabled'); return; }
        setPublicKey(d.publicKey);
        if (Notification.permission === 'denied') { setState('denied'); return; }
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
      } catch (e) {
        setState('unsupported');
      }
    })();
  }, []);

  async function enable() {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); setBusy(false); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json()).error || '구독 저장 실패');
      setState('on');
      setMsg('이 기기로 알림을 보내드릴게요.');
    } catch (e) {
      setMsg(e.message || '알림을 켜지 못했어요.');
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true); setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('off');
    } catch (e) {
      setMsg('알림을 끄지 못했어요.');
    }
    setBusy(false);
  }

  if (state === 'loading' || state === 'disabled') return null; // 서버에 푸시 설정이 없으면 카드 자체를 숨김

  return (
    <div className="card" style={{ maxWidth: 440, marginTop: 20 }}>
      <h3 style={{ marginTop: 0, fontSize: 14.5 }}>📲 푸시 알림</h3>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6 }}>
        마감 임박, 새 참여자, 결제 확인, 송장 등록 같은 소식을 앱을 열지 않아도 폰 알림으로 받아요. (알림 종류는 아래 "알림 설정"에서 고를 수 있어요)
      </p>
      {state === 'unsupported' && <p style={{ fontSize: 12.5 }}>이 브라우저에서는 푸시 알림을 지원하지 않아요.</p>}
      {state === 'needs-install' && (
        <p style={{ fontSize: 12.5 }}>
          아이폰은 사파리에서 <strong>공유 버튼 → "홈 화면에 추가"</strong>로 앱을 설치한 뒤, 설치된 공구온 앱에서 알림을 켤 수 있어요.
        </p>
      )}
      {state === 'denied' && (
        <p style={{ fontSize: 12.5 }}>브라우저에서 알림이 차단돼 있어요. 주소창 옆 자물쇠(사이트 설정)에서 알림을 "허용"으로 바꿔주세요.</p>
      )}
      {state === 'off' && <button className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>{busy ? '켜는 중…' : '이 기기에서 알림 켜기'}</button>}
      {state === 'on' && (
        <>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success, #2e9d5b)' }}>✅ 이 기기에서 알림을 받는 중이에요</p>
          <button className="btn btn-ghost btn-sm" onClick={disable} disabled={busy}>{busy ? '끄는 중…' : '알림 끄기'}</button>
        </>
      )}
      {msg && <p style={{ fontSize: 12.5, marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
