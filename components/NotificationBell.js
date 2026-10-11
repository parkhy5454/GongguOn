'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef(null);

  async function load() {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setItems(data.notifications);
      setUnread(data.unreadCount);
    }
  }

  useEffect(() => {
    load();
    const socket = io({ path: '/socket.io' });
    let connectedBefore = false;
    socket.on('connect', () => {
      if (connectedBefore) load(); // 재연결 시 놓친 알림 새로 불러오기
      connectedBefore = true;
    });
    socket.on('notification', (n) => {
      setItems((prev) => [n, ...prev]);
      setUnread((prev) => prev + 1);
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function openItem(n) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} title="알림">
        🔔{unread > 0 ? ` ${unread}` : ''}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute', right: 0, top: 38, width: 320, maxHeight: 420, overflowY: 'auto',
            zIndex: 30, padding: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: 13 }}>알림</strong>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ padding: '2px 8px', fontSize: 11 }}>모두 읽음</button>
            )}
          </div>
          {items.length === 0 && <div className="empty-state" style={{ padding: 20 }}>알림이 없어요.</div>}
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => openItem(n)}
              style={{
                padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: n.read ? 'transparent' : 'var(--accent-soft)',
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
