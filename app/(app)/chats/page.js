'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const STATUS_CLASS = { OPEN: 'badge-open', CLOSED: 'badge-closed', CANCELLED: 'badge-cancelled', COMPLETED: 'badge-completed' };

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function ChatsPage() {
  const [chats, setChats] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/my/chats');
      if (res.ok) setChats((await res.json()).chats);
    })();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>💬 채팅</h1>
          <p>참여했거나 개설한 공구의 대화를 한곳에서 확인해요</p>
        </div>
      </div>

      {!chats && <div className="empty-state">불러오는 중…</div>}
      {chats?.length === 0 && (
        <div className="empty-state">아직 대화가 없어요. 공구에 참여하거나 개설하면 여기에 채팅방이 생겨요.</div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {chats?.map((c) => (
          <Link
            key={c.eventId}
            href={`/events/${c.eventId}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: '1px solid var(--border)', color: 'inherit',
            }}
          >
            {c.image ? (
              <img src={c.image} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--bg-input)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                💬
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                {c.isHost && <span style={{ fontSize: 10.5, color: 'var(--accent)', flexShrink: 0 }}>판매자</span>}
                <span className={`badge ${STATUS_CLASS[c.status]}`} style={{ flexShrink: 0 }}>{STATUS_LABEL[c.status]}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {c.lastMessage ? `${c.lastMessage.author}: ${c.lastMessage.content}` : '아직 메시지가 없어요'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{timeAgo(c.lastMessage?.createdAt)}</div>
              {c.unreadCount > 0 && (
                <div style={{
                  marginTop: 4, background: 'var(--accent)', color: '#fff', borderRadius: 999,
                  fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {c.unreadCount > 99 ? '99+' : c.unreadCount}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
