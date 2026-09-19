'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, ref }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '회원가입에 실패했습니다.');
      setLoading(false);
      return;
    }
    router.push('/events');
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>공구온 시작하기</h1>
        <p className="sub">30초면 가입이 끝나요 — 구매자로도, 판매자로도 바로 활동 가능</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>이름 / 닉네임</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="홍길동" />
          </div>
          <div className="field">
            <label>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" />
          </div>
          <div className="field">
            <label>휴대폰 번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="010-1234-5678"
              pattern="^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$"
              title="예: 010-1234-5678"
            />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="6자 이상" />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? '가입 중…' : '가입하고 시작하기'}
          </button>
        </form>
        <p className="hint">
          이미 계정이 있으신가요? <Link href="/login" style={{ color: 'var(--accent)' }}>로그인</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
