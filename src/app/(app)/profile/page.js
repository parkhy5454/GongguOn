'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NOTIFICATION_TYPES } from '@/lib/notificationTypes';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');
  const [email, setEmail] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  const [muted, setMuted] = useState([]);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [logoutAllMsg, setLogoutAllMsg] = useState('');

  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function logoutAllDevices() {
    setLoggingOutAll(true);
    setLogoutAllMsg('');
    const res = await fetch('/api/me/logout-all', { method: 'POST' });
    setLoggingOutAll(false);
    if (res.ok) {
      router.push('/login');
      router.refresh();
    } else {
      setLogoutAllMsg('처리에 실패했습니다.');
    }
  }

  async function deleteAccount(e) {
    e.preventDefault();
    setDeleting(true);
    setDeleteMsg('');
    const res = await fetch('/api/me/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword }),
    });
    const d = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteMsg(d.error || '탈퇴에 실패했습니다.');
      return;
    }
    router.push('/login');
    router.refresh();
  }

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me');
      if (res.ok) {
        const { user } = await res.json();
        setName(user.name || '');
        setPhone(user.phone || '');
        setDefaultAddress(user.defaultAddress || '');
        setEmail(user.email || '');
        setMuted(user.mutedNotificationTypes || []);
      }
      setLoading(false);
    })();
  }, []);

  function toggleMuted(key) {
    setMuted((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function saveNotifPrefs() {
    setSavingNotif(true);
    setNotifMsg('');
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutedNotificationTypes: muted }),
    });
    setSavingNotif(false);
    setNotifMsg(res.ok ? '저장됐어요.' : '저장에 실패했습니다.');
  }

  async function saveInfo(e) {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg('');
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, defaultAddress }),
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
          <div className="field">
            <label>기본 배송지 (선택 — 저장해두면 공구 참여 시 자동으로 채워져요)</label>
            <textarea
              value={defaultAddress}
              onChange={(e) => setDefaultAddress(e.target.value)}
              rows={2}
              placeholder="예: 서울시 강남구 테헤란로 123, 101동 1001호"
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

      <div className="card" style={{ maxWidth: 440, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>알림 설정</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6 }}>받고 싶지 않은 알림의 체크를 해제하세요.</p>
        {NOTIFICATION_TYPES.map((t) => (
          <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!muted.includes(t.key)}
              onChange={() => toggleMuted(t.key)}
              style={{ width: 'auto' }}
            />
            {t.label}
          </label>
        ))}
        {notifMsg && (
          <p style={{ fontSize: 12.5, color: notifMsg === '저장됐어요.' ? 'var(--success)' : 'var(--danger)' }}>{notifMsg}</p>
        )}
        <button className="btn btn-primary btn-sm" onClick={saveNotifPrefs} disabled={savingNotif}>
          {savingNotif ? '저장 중…' : '저장'}
        </button>
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

      <div className="card" style={{ maxWidth: 440, marginTop: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>다른 기기에서 로그아웃</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6 }}>
          분실한 기기 등 다른 곳에 남아있는 로그인을 전부 끊고, 이 기기에서도 다시 로그인하게 됩니다.
        </p>
        {logoutAllMsg && <p className="error-text">{logoutAllMsg}</p>}
        <button className="btn btn-ghost" onClick={logoutAllDevices} disabled={loggingOutAll}>
          {loggingOutAll ? '처리 중…' : '모든 기기에서 로그아웃'}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 440, marginTop: 20, borderColor: 'var(--danger)' }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5, color: 'var(--danger)' }}>회원 탈퇴</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6 }}>
          탈퇴하면 다시 로그인할 수 없어요. 진행중인 공구를 개설했거나 미정산 매출이 있으면 탈퇴할 수 없습니다.
        </p>
        {!showDeleteConfirm ? (
          <button className="btn btn-danger-outline btn-sm" onClick={() => setShowDeleteConfirm(true)}>
            회원 탈퇴하기
          </button>
        ) : (
          <form onSubmit={deleteAccount}>
            <div className="field">
              <label>본인 확인을 위해 비밀번호를 입력해주세요</label>
              <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required />
            </div>
            {deleteMsg && <p className="error-text">{deleteMsg}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>
                취소
              </button>
              <button type="submit" className="btn btn-danger-outline" style={{ flex: 1 }} disabled={deleting}>
                {deleting ? '처리 중…' : '정말 탈퇴할게요'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
