'use client';

import { useEffect, useState } from 'react';

// 내가 차단한 사용자 목록과 차단 해제
export default function BlockedUsers() {
  const [blocks, setBlocks] = useState(null);

  async function load() {
    const res = await fetch('/api/blocks');
    if (res.ok) setBlocks((await res.json()).blocks);
  }
  useEffect(() => { load(); }, []);

  async function unblock(userId) {
    const res = await fetch(`/api/blocks?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="card" style={{ maxWidth: 440, marginTop: 20 }}>
      <h3 style={{ marginTop: 0, fontSize: 14.5 }}>🚫 차단한 사용자</h3>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6 }}>
        차단하면 그 사람의 채팅 메시지와 공구가 내 화면에 보이지 않아요.
      </p>
      {blocks.map((b) => (
        <div key={b.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13.5 }}>
          <span>{b.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => unblock(b.userId)}>차단 해제</button>
        </div>
      ))}
    </div>
  );
}
