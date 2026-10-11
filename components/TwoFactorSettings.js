'use client';

import { useEffect, useState } from 'react';

// 관리자 계정 전용 2단계 인증(인증 앱) 설정 카드. 관리자가 아니면 아무것도 보이지 않아요.
export default function TwoFactorSettings() {
  const [status, setStatus] = useState(null); // { eligible, enabled }
  const [setup, setSetup] = useState(null); // { secret, qr }
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    const res = await fetch('/api/me/2fa');
    if (res.ok) setStatus(await res.json());
  }
  useEffect(() => { loadStatus(); }, []);

  if (!status || !status.eligible) return null;

  async function startSetup() {
    setBusy(true); setMsg('');
    const res = await fetch('/api/me/2fa/setup', { method: 'POST' });
    const d = await res.json();
    if (!res.ok) { setMsg(d.error || '설정을 시작하지 못했어요.'); setBusy(false); return; }
    const QRCode = (await import('qrcode')).default;
    const qr = await QRCode.toDataURL(d.otpauthUrl, { width: 200, margin: 1 });
    setSetup({ secret: d.secret, qr });
    setBusy(false);
  }

  async function enable(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const res = await fetch('/api/me/2fa/enable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(d.error || '확인에 실패했어요.'); return; }
    setSetup(null); setCode(''); setMsg('2단계 인증이 켜졌어요. 다음 로그인부터 코드가 필요해요.');
    loadStatus();
  }

  async function disable(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const res = await fetch('/api/me/2fa/disable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, code }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(d.error || '해제에 실패했어요.'); return; }
    setShowDisable(false); setCode(''); setPassword(''); setMsg('2단계 인증을 껐어요.');
    loadStatus();
  }

  return (
    <div className="card" style={{ maxWidth: 440, marginTop: 20 }}>
      <h3 style={{ marginTop: 0, fontSize: 14.5 }}>관리자 2단계 인증</h3>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6 }}>
        비밀번호가 유출돼도 관리자 기능을 지킬 수 있어요. 구글 OTP·Microsoft Authenticator·Authy 같은 인증 앱이 필요해요.
      </p>

      {status.enabled ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--success, #2e9d5b)', fontWeight: 600 }}>✅ 켜져 있어요</p>
          {!showDisable ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowDisable(true); setMsg(''); }}>끄기</button>
          ) : (
            <form onSubmit={disable}>
              <div className="field">
                <label>비밀번호</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="field">
                <label>인증 앱의 6자리 코드</label>
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" required />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowDisable(false)}>취소</button>
                <button className="btn btn-danger-outline" style={{ flex: 1 }} disabled={busy}>{busy ? '처리 중…' : '끄기'}</button>
              </div>
            </form>
          )}
        </>
      ) : setup ? (
        <form onSubmit={enable}>
          <p style={{ fontSize: 12.5, margin: '0 0 8px' }}>
            1) 인증 앱에서 <strong>QR 코드를 스캔</strong>하세요. (스캔이 안 되면 아래 키를 직접 입력)<br />
            2) 앱에 표시된 <strong>6자리 숫자</strong>를 입력하고 확인을 누르세요.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="2단계 인증 QR 코드" width={200} height={200} style={{ display: 'block', background: '#fff', borderRadius: 8, marginBottom: 8 }} />
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)', wordBreak: 'break-all', margin: '0 0 10px' }}>
            직접 입력용 키: <code>{setup.secret}</code>
          </p>
          <div className="field">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6자리 숫자" required />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? '확인 중…' : '확인하고 켜기'}</button>
        </form>
      ) : (
        <button className="btn btn-primary btn-sm" onClick={startSetup} disabled={busy}>{busy ? '준비 중…' : '2단계 인증 켜기'}</button>
      )}
      {msg && <p style={{ fontSize: 12.5, marginTop: 8 }} className={msg.includes('않') || msg.includes('실패') || msg.includes('맞지') ? 'error-text' : undefined}>{msg}</p>}
    </div>
  );
}
