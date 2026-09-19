'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || '요청에 실패했습니다.');
      return;
    }
    setSent(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>비밀번호 찾기</h1>
        <p className="sub">가입하신 이메일로 재설정 링크를 보내드려요</p>

        {sent ? (
          <div>
            <p style={{ fontSize: 13.5, color: 'var(--text)' }}>
              <strong>{email}</strong>(으)로 재설정 링크를 보냈어요.<br />
              이메일함(스팸함 포함)을 확인해주세요. 가입된 계정이 없다면 메일이 오지 않아요.
            </p>
            <p className="hint">
              <Link href="/login" style={{ color: 'var(--accent)' }}>로그인으로 돌아가기</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
              {loading ? '전송 중…' : '재설정 링크 받기'}
            </button>
            <p className="hint">
              <Link href="/login" style={{ color: 'var(--accent)' }}>로그인으로 돌아가기</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
