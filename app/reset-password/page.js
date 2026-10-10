'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('비밀번호가 서로 달라요.');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(d.error || '재설정에 실패했습니다.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/login'), 1500);
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>링크가 올바르지 않아요</h1>
          <p className="sub">이메일에 있는 링크를 통해 다시 접속해주세요.</p>
          <Link href="/forgot-password" className="btn btn-primary btn-block">비밀번호 찾기로 이동</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>새 비밀번호 설정</h1>
        <p className="sub">새로 쓸 비밀번호를 입력해주세요</p>

        {done ? (
          <p style={{ fontSize: 13.5 }}>비밀번호가 변경됐어요! 로그인 화면으로 이동합니다…</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>새 비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="8자 이상, 영문+숫자 포함" />
            </div>
            <div className="field">
              <label>새 비밀번호 확인</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="다시 한 번 입력" />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
              {loading ? '변경 중…' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
