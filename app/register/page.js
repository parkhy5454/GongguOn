'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Turnstile, { captchaEnabled } from '@/components/Turnstile';
import KakaoButton from '@/components/KakaoButton';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const rawNext = searchParams.get('next');
  const next = typeof rawNext === 'string' && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') ? rawNext : '/events';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const allAgreed = agreeTerms && agreePrivacy && ageOk;
  function toggleAll(v) { setAgreeTerms(v); setAgreePrivacy(v); setAgeOk(v); }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!allAgreed) {
      setError('필수 항목(이용약관, 개인정보처리방침, 만 14세 이상)에 모두 동의해주세요.');
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setError('사람 확인이 끝날 때까지 잠시만 기다려주세요.');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, ref, agreed: allAgreed, ageOk, captchaToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '회원가입에 실패했습니다.');
      setCaptchaReset((n) => n + 1);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>공구온 시작하기</h1>
        <p className="sub">30초면 가입이 끝나요 — 구매자로도, 판매자로도 바로 활동 가능</p>
        <KakaoButton next={next} refCode={ref} />
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="8자 이상, 영문+숫자 포함" />
          </div>
          <div className="field" style={{ gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={allAgreed} onChange={(e) => toggleAll(e.target.checked)} style={{ width: 'auto' }} />
              전체 동의
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ width: 'auto' }} />
              <span>
                <a href="/terms" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>이용약관</a>에 동의합니다 (필수)
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} style={{ width: 'auto' }} />
              <span>
                <a href="/privacy" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>개인정보 수집·이용</a>에 동의합니다 (필수)
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} style={{ width: 'auto' }} />
              <span>만 14세 이상입니다 (필수)</span>
            </label>
          </div>
          <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
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
