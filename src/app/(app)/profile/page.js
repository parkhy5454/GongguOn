'use client';

import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me');
      if (res.ok) {
        const { user } = await res.json();
        setName(user.name || '');
        setPhone(user.phone || '');
        setEmail(user.email || '');
      }
      setLoading(false);
    })();
  }, []);

  async function saveInfo(e) {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg('');
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    const d = await res.json();
    setSavingInfo(false);
    setInfoMsg(res.ok ? '저장됐어요.' : d.error || '저장에 실패했습니다.');
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg('');
    if (newPassword !== newPassword2) {
      setPwMsg('새 비밀번호가 서로 달라요.');
      return;
    }
    setSavingPw(true);
    const res = await fetch('/api/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await res.json();
    setSavingPw(false);
    if (!res.ok) {
      setPwMsg(d.error || '변경에 실패했습니다.');
      return;
    }
    setPwMsg('비밀번호가 변경됐어요.');
    setCurrentPassword('');
    setNewPassword('');
    setNewPassword2('');
  }

  if (loading) return <div className="empty-state">불러오는 중…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>내 정보 수정</h1>
          <p>이름, 휴대폰 번호, 비밀번호를 변경할 수 있어요</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 440, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>기본 정보</h3>
        <form onSubmit={saveInfo}>
          <div className="field">
            <label>이메일 (변경 불가)</label>
            <input value={email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field">
            <label>이름 / 닉네임</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>휴대폰 번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
            />
          </div>
          {infoMsg && (
            <p style={{ fontSize: 12.5, color: infoMsg === '저장됐어요.' ? 'var(--success)' : 'var(--danger)' }}>{infoMsg}</p>
          )}
          <button className="btn btn-primary" type="submit" disabled={savingInfo}>
            {savingInfo ? '저장 중…' : '저장'}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 440 }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>비밀번호 변경</h3>
        <form onSubmit={savePassword}>
          <div className="field">
            <label>현재 비밀번호</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label>새 비밀번호</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="6자 이상" />
          </div>
          <div className="field">
            <label>새 비밀번호 확인</label>
            <input type="password" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} required />
          </div>
          {pwMsg && (
            <p style={{ fontSize: 12.5, color: pwMsg === '비밀번호가 변경됐어요.' ? 'var(--success)' : 'var(--danger)' }}>{pwMsg}</p>
          )}
          <button className="btn btn-primary" type="submit" disabled={savingPw}>
            {savingPw ? '변경 중…' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </>
  );
}
