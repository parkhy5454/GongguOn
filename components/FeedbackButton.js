'use client';

import { useState } from 'react';

const CATEGORY_LABEL = { BUG: '🐛 버그 신고', SUGGESTION: '💡 기능 제안', OTHER: '💬 기타 문의' };

export default function FeedbackButton() {
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('SUGGESTION');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, content }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(d.error || '전송에 실패했습니다.');
      return;
    }
    setMsg('의견이 전달됐어요. 감사합니다!');
    setContent('');
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)} title="문의하기">
        💬 <span className="btn-label">문의하기</span>
      </button>

      {showModal && (
        <div className="modal-backdrop" onClick={() => { setShowModal(false); setMsg(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>💬 문의 / 제안 / 버그 신고</h2>
            <form onSubmit={submit}>
              <div className="field">
                <label>종류</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                  placeholder="어떤 점이 불편하셨나요? 어떤 기능이 있으면 좋을까요?"
                />
              </div>
              {msg && (
                <p style={{ fontSize: 12.5, color: msg.includes('전달됐어요') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowModal(false); setMsg(''); }}>
                  닫기
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? '전송 중…' : '보내기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
