'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Turnstile, { captchaEnabled } from '@/components/Turnstile';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [totp, setTotp] = useState('');
  const [ticket, setTicket] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (captchaEnabled && !needTotp && !captchaToken) {
      setError('사람 확인이 끝날 때까지 잠시만 기다려주세요.');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(needTotp ? { ticket, totp } : { email, password, captchaToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.restart) {
        // 티켓 만료/잠금: 처음부터 다시
        setNeedTotp(false); setTicket(''); setTotp(''); setPassword('');
        setError(data.error || '처음부터 다시 로그인해주세요.');
        setCaptchaReset((n) => n + 1);
      } else if (data.needTotp) {
        if (data.ticket) setTicket(data.ticket);
        setNeedTotp(true);
        setTotp('');
        if (ticket) setError(data.error);
      } else {
        setError(data.error || '로그인에 실패했습니다.');
        setCaptchaReset((n) => n + 1);
      }
      setLoading(false);
      return;
    }
    router.push('/events');
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>공구온</h1>
        <p className="sub">정산·재고·신뢰까지, 공동구매 전용 플랫폼</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" disabled={needTotp} />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" disabled={needTotp} />
            {!needTotp && (
              <div style={{ textAlign: 'right' }}>
                <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--text-dim)' }}>비밀번호를 잊으셨나요?</Link>
              </div>
            )}
          </div>
          {needTotp && (
            <div className="field">
              <label>2단계 인증 코드</label>
              <input
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                placeholder="인증 앱의 6자리 숫자"
              />
            </div>
          )}
          {!needTotp && <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />}
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? '로그인 중…' : needTotp ? '인증하고 로그인' : '로그인'}
          </button>
        </form>
        <p className="hint">
          계정이 없으신가요? <Link href="/register" style={{ color: 'var(--accent)' }}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}
