'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 카카오로 처음 오신 분: 휴대폰 번호와 약관 동의만 받으면 가입이 끝나요.
export default function KakaoSignupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const allAgreed = agreeTerms && agreePrivacy && ageOk;

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/auth/kakao/pending');
      if (!res.ok) { setExpired(true); setReady(true); return; }
      const d = await res.json();
      setName(d.name || '');
      setEmail(d.email || '');
      setHasEmail(!!d.hasEmail);
      setReady(true);
    })();
  }, []);

  function toggleAll(v) { setAgreeTerms(v); setAgreePrivacy(v); setAgeOk(v); }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!allAgreed) { setError('필수 항목(이용약관, 개인정보 수집·이용, 만 14세 이상)에 모두 동의해주세요.'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/kakao/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, agreed: allAgreed, ageOk }),
    });
    const d = await res.json();
    if (!res.ok) {
      if (d.restart) setExpired(true);
      setError(d.error || '가입에 실패했어요.');
      setLoading(false);
      return;
    }
    router.push(d.next || '/events');
    router.refresh();
  }

  if (!ready) return null;

  if (expired) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>시간이 지났어요</h1>
          <p className="sub">카카오 로그인을 처음부터 다시 시작해주세요.</p>
          <Link href="/login" className="btn btn-primary btn-block">로그인 화면으로</Link>
        </div>
      </div>
    );
  }

  const label = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 12.5, cursor: 'pointer' };
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>거의 다 됐어요!</h1>
        <p className="sub">휴대폰 번호와 약관 동의만 하면 가입이 끝나요</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>이름 / 닉네임</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {hasEmail ? (
            <div className="field">
              <label>이메일 (카카오 인증 완료)</label>
              <input value={email} disabled />
            </div>
          ) : (
            <div className="field">
              <label>이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" />
            </div>
          )}
          <div className="field">
            <label>휴대폰 번호</label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
              placeholder="010-1234-5678" pattern="^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$" title="예: 010-1234-5678"
            />
          </div>
          <div className="field" style={{ gap: 8 }}>
            <label style={{ ...label, fontSize: 13.5, fontWeight: 600 }}>
              <input type="checkbox" checked={allAgreed} onChange={(e) => toggleAll(e.target.checked)} style={{ width: 'auto' }} />
              전체 동의
            </label>
            <label style={label}>
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ width: 'auto' }} />
              <span><a href="/terms" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>이용약관</a>에 동의합니다 (필수)</span>
            </label>
            <label style={label}>
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} style={{ width: 'auto' }} />
              <span><a href="/privacy" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>개인정보 수집·이용</a>에 동의합니다 (필수)</span>
            </label>
            <label style={label}>
              <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} style={{ width: 'auto' }} />
              <span>만 14세 이상입니다 (필수)</span>
            </label>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? '가입 중…' : '가입 완료하고 시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
