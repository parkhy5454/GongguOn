'use client';

import { useEffect, useRef } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const captchaEnabled = !!SITE_KEY;

function loadScript() {
  return new Promise((resolve) => {
    if (window.turnstile) return resolve();
    let el = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (!el) {
      el = document.createElement('script');
      el.src = SCRIPT_SRC;
      el.async = true;
      document.head.appendChild(el);
    }
    el.addEventListener('load', () => resolve());
  });
}

// 사람 확인(캡차) 위젯. NEXT_PUBLIC_TURNSTILE_SITE_KEY가 없으면 아무것도 표시하지 않아요.
// 토큰은 1회용이라, 실패한 시도 후에는 resetKey를 바꿔서 위젯을 새로 고쳐야 합니다.
export default function Turnstile({ onToken, resetKey = 0 }) {
  const boxRef = useRef(null);
  const widgetRef = useRef(null);
  const cbRef = useRef(onToken);
  cbRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !boxRef.current || widgetRef.current !== null) return;
      widgetRef.current = window.turnstile.render(boxRef.current, {
        sitekey: SITE_KEY,
        callback: (t) => cbRef.current(t),
        'expired-callback': () => cbRef.current(''),
        'error-callback': () => cbRef.current(''),
      });
    });
    return () => {
      cancelled = true;
      if (widgetRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetRef.current); } catch (e) {}
        widgetRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (resetKey && widgetRef.current !== null && window.turnstile) {
      cbRef.current('');
      try { window.turnstile.reset(widgetRef.current); } catch (e) {}
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={boxRef} style={{ margin: '4px 0 8px' }} />;
}
