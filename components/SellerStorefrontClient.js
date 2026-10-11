'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const STATUS_CLASS = { OPEN: 'badge-open', CLOSED: 'badge-closed', CANCELLED: 'badge-cancelled', COMPLETED: 'badge-completed' };

export default function SellerStorefrontPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/sellers/${id}`);
      if (res.ok) setData(await res.json());
      const b = await fetch('/api/blocks');
      if (b.ok) setBlocked((await b.json()).blocks.some((x) => x.userId === id));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="empty-state">불러오는 중…</div>;
  if (!data) return <div className="empty-state">판매자를 찾을 수 없어요.</div>;

  const { seller, events, rating, reviews, followerCount, isFollowing, isMe } = data;

  async function toggleBlock() {
    if (!blocked && !confirm(`${seller.name}님을 차단할까요? 이 판매자의 공구가 목록에서 숨겨지고 채팅 메시지가 보이지 않아요.`)) return;
    const res = blocked
      ? await fetch(`/api/blocks?userId=${id}`, { method: 'DELETE' })
      : await fetch('/api/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) });
    if (res.ok) setBlocked(!blocked);
  }

  async function toggleFollow() {
    const res = await fetch(`/api/sellers/${id}/follow`, { method: 'POST' });
    if (res.ok) {
      const d = await res.json();
      setData((prev) => ({ ...prev, isFollowing: d.following, followerCount: prev.followerCount + (d.following ? 1 : -1) }));
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{seller.name}님의 상점{seller.sellerVerified && <span style={{ marginLeft: 8, fontSize: 13, color: '#1a7f4b' }}>✅ 인증 판매자</span>}</h1>
          <p>
            {rating.avg ? `⭐ ${rating.avg.toFixed(1)} (후기 ${rating.count}건)` : '아직 받은 후기가 없어요'}
            {' · 개설한 공구 '}{events.length}건{' · 팔로워 '}{followerCount}명
          </p>
          {!isMe && (
            <button className={`btn btn-sm ${isFollowing ? 'btn-primary' : 'btn-ghost'}`} onClick={toggleFollow} style={{ marginTop: 6 }}>
              {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
            </button>
          )}
          {!isMe && (
            <button className="btn btn-ghost btn-sm" onClick={toggleBlock} style={{ marginTop: 6, marginLeft: 6 }}>
              {blocked ? '차단 해제' : '🚫 차단'}
            </button>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: 15 }}>개설한 공구</h3>
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        {events.map((ev) => {
          const minPrice = ev.options.length ? Math.min(...ev.options.map((o) => o.price)) : 0;
          return (
            <Link key={ev.id} href={`/events/${ev.id}`} className="card event-card">
              {ev.images?.[0] && (
                <img src={ev.images[0]} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>{ev.title}</h3>
                <span className={`badge ${STATUS_CLASS[ev.status]}`}>{STATUS_LABEL[ev.status]}</span>
              </div>
              <div className="price">{minPrice.toLocaleString()}원~</div>
            </Link>
          );
        })}
        {events.length === 0 && <div className="empty-state">아직 개설한 공구가 없어요.</div>}
      </div>

      {reviews.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14.5 }}>받은 후기</h3>
          {reviews.map((r) => (
            <div key={r.id} className="review-row">
              <div className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.reviewer.name}</div>
              {r.comment && <div style={{ marginTop: 3 }}>{r.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
