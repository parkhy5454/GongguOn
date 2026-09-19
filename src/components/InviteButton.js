'use client';

import { useState } from 'react';

export default function InviteButton({ referralCode }) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = `${origin}/register?ref=${referralCode}`;
  const shareText = `공구온에서 같이 공동구매 해요! 이 링크로 가입하면 서로 포인트 혜택이 있어요 🎁`;

  async function handleInvite() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: '공구온 초대', text: shareText, url: link });
        return;
      } catch {
        // 사용자가 취소했거나 공유 실패 시 아래 모달로 대체
      }
    }
    setShowModal(true);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${shareText}\n${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const smsHref = `sms:?body=${encodeURIComponent(`${shareText} ${link}`)}`;

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={handleInvite} title="친구 초대">
        🎁 친구 초대
      </button>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🎁 친구 초대하기</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: -6, marginBottom: 14 }}>
              친구가 이 링크로 가입 후 첫 구매나 첫 공구를 열면 두 분 모두 포인트를 받아요.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={smsHref} className="btn btn-ghost btn-block">💬 문자로 보내기</a>
              <button className="btn btn-ghost btn-block" onClick={copyLink}>
                {copied ? '✅ 복사됨! 카카오톡에 붙여넣으세요' : '🔗 링크 복사 (카카오톡 등에 붙여넣기)'}
              </button>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-input)', borderRadius: 8, fontSize: 11.5, color: 'var(--text-dim)', wordBreak: 'break-all' }}>
              {link}
            </div>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => setShowModal(false)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
