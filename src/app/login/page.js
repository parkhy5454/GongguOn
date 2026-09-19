'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '로그인에 실패했습니다.');
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            <div style={{ textAlign: 'right' }}>
              <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--text-dim)' }}>비밀번호를 잊으셨나요?</Link>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <p className="hint">
          계정이 없으신가요? <Link href="/register" style={{ color: 'var(--accent)' }}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}
