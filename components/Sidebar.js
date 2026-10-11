'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [channels, setChannels] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrivate, setNewPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadChannels() {
    const res = await fetch('/api/channels');
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels);
    }
  }

  useEffect(() => {
    loadChannels();
  }, [pathname]);

  async function createChannel(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), isPrivate: newPrivate }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setShowModal(false);
      setNewName('');
      setNewPrivate(false);
      await loadChannels();
      router.push(`/dashboard/channel/${data.channel.id}`);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">WorkTalk</div>
        <div className="brand-sub">{user.name}님, 반가워요</div>
      </div>

      <div className="nav-section">
        <div className="nav-label">개요</div>
        <Link href="/dashboard/todos" className={`nav-item ${pathname === '/dashboard/todos' ? 'active' : ''}`}>
          ✅ 할 일
        </Link>
        <Link href="/dashboard/decisions" className={`nav-item ${pathname === '/dashboard/decisions' ? 'active' : ''}`}>
          📌 결정 로그
        </Link>

        <div className="nav-label" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>채널</span>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 15, cursor: 'pointer' }}
            title="새 채널"
          >
            +
          </button>
        </div>
        {channels.map((ch) => (
          <Link
            key={ch.id}
            href={`/dashboard/channel/${ch.id}`}
            className={`nav-item ${pathname === `/dashboard/channel/${ch.id}` ? 'active' : ''}`}
          >
            {ch.isPrivate ? '🔒' : '#'} {ch.name}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <span>{user.email}</span>
        <button className="btn btn-danger" onClick={logout} style={{ padding: '4px 8px', fontSize: 12 }}>
          로그아웃
        </button>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>새 채널 만들기</h2>
            <form onSubmit={createChannel}>
              <div className="field">
                <label>채널 이름</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 마케팅팀"
                />
              </div>
              <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newPrivate}
                  onChange={(e) => setNewPrivate(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="isPrivate" style={{ color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                  🔒 비공개 채널로 만들기 (초대한 사람만 볼 수 있어요)
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>
                  {creating ? '생성 중…' : '만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
