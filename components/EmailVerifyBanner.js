'use client';

import { useState } from 'react';

export default function EmailVerifyBanner() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    await fetch('/api/auth/resend-verification', { method: 'POST' });
    setSending(false);
    setSent(true);
  }

  return (
    <div style={{
      background: '#fff4d9', color: '#a8690a', fontSize: 13,
      padding: '10px 20px', textAlign: 'center', fontWeight: 600,
    }}>
      ✉️ 이메일 인증이 안 되어 있어요.{' '}
      {sent ? (
        '인증 메일을 다시 보냈어요. 메일함을 확인해주세요.'
      ) : (
        <button onClick={resend} disabled={sending} style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'inherit', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          {sending ? '전송 중…' : '인증 메일 다시 받기'}
        </button>
      )}
    </div>
  );
}
