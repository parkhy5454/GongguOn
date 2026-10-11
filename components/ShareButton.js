'use client';
import { useState } from 'react';

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

function loadKakaoSdk() {
  return new Promise((resolve, reject) => {
    if (window.Kakao) return resolve(window.Kakao);
    const s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    s.async = true;
    s.onload = () => resolve(window.Kakao);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function ShareButton({ title, description, imageUrl, path }) {
  const [msg, setMsg] = useState('');

  function url() {
    return window.location.origin + (path || window.location.pathname);
  }
  function flash(t) { setMsg(t); setTimeout(() => setMsg(''), 2500); }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      flash('링크를 복사했어요');
    } catch {
      window.prompt('링크를 복사하세요', url());
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description || title, url: url() });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    await copy();
  }

  async function shareKakao() {
    try {
      const K = await loadKakaoSdk();
      if (!K.isInitialized()) K.init(KAKAO_JS_KEY);
      K.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description: description || '공구온에서 같이 사요!',
          imageUrl: imageUrl || window.location.origin + '/icons/icon-512.png',
          link: { mobileWebUrl: url(), webUrl: url() },
        },
        buttons: [{ title: '공구 보러가기', link: { mobileWebUrl: url(), webUrl: url() } }],
      });
    } catch {
      await share();
    }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      {KAKAO_JS_KEY && (
        <button type="button" className="btn btn-sm" style={{ background: '#fee500', color: '#191919', border: 0 }} onClick={shareKakao}>
          💬 카카오톡 공유
        </button>
      )}
      <button type="button" className="btn btn-ghost btn-sm" onClick={share}>🔗 공유</button>
      {msg && <span style={{ fontSize: 12, color: 'var(--success)' }}>{msg}</span>}
    </span>
  );
}
