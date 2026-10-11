'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const STATUS_CLASS = { OPEN: 'badge-open', CLOSED: 'badge-closed', CANCELLED: 'badge-cancelled', COMPLETED: 'badge-completed' };
const PAY_LABEL = { PENDING: '입금 대기', PAID: '입금 확인 요청', CONFIRMED: '결제 완료', REFUNDED: '환불됨' };

function formatDT(iso) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MyPage() {
  const [me, setMe] = useState(null);
  const [events, setEvents] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [tab, setTab] = useState('orders');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [meRes, evRes, orderRes, favRes] = await Promise.all([
        fetch('/api/me'),
        fetch('/api/events'),
        fetch('/api/my/orders'),
        fetch('/api/my/favorites'),
      ]);
      if (meRes.ok) setMe((await meRes.json()).user);
      if (evRes.ok) setEvents((await evRes.json()).events);
      if (orderRes.ok) setMyOrders((await orderRes.json()).orders);
      if (favRes.ok) setFavorites((await favRes.json()).favorites);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="empty-state">불러오는 중…</div>;

  const hosted = events.filter((e) => e.host.id === me?.id);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>내 활동</h1>
          <p>
            {me?.name}님
            {me?.rating ? ` · 판매자 평점 ⭐ ${me.rating.toFixed(1)} (${me.reviewCount}건)` : ' · 아직 받은 후기가 없어요'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>내 포인트</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{(me?.pointBalance || 0).toLocaleString()}P</div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
          <Link href="/my/sales" className="btn btn-ghost btn-sm" style={{ marginRight: 8 }}>📊 내 매출·정산</Link>
          친구가 내 초대 링크로 가입 후 첫 구매/첫 공구를 열면 포인트가 쌓여요. 상단 "🎁 친구 초대" 버튼을 눌러보세요.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'orders' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('orders')}>
          참여한 공구 ({myOrders.length})
        </button>
        <button className={`btn btn-sm ${tab === 'hosted' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('hosted')}>
          개설한 공구 ({hosted.length})
        </button>
        <button className={`btn btn-sm ${tab === 'favorites' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('favorites')}>
          찜한 공구 ({favorites.length})
        </button>
      </div>

      {tab === 'orders' && (
        <div className="card">
          {myOrders.length === 0 && <div className="empty-state">아직 참여한 공구가 없어요.<div style={{ marginTop: 10 }}><Link href="/events" className="btn btn-primary btn-sm">공구 구경하기</Link></div></div>}
          {myOrders.map((o) => (
            <Link key={o.id} href={`/events/${o.event.id}`} className="order-row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ flex: 1 }}>
                {o.event.title} · {o.option.name} × {o.quantity}개 · {o.amount.toLocaleString()}원
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{formatDT(o.createdAt)}</div>
              </span>
              <span className={`status-pill status-${o.paymentStatus}`}>{PAY_LABEL[o.paymentStatus]}</span>
            </Link>
          ))}
        </div>
      )}

      {tab === 'hosted' && (
        <div className="grid-cards">
          {hosted.length === 0 && <div className="empty-state">아직 개설한 공구가 없어요.<div style={{ marginTop: 10 }}><Link href="/events/new" className="btn btn-primary btn-sm">첫 공구 열기</Link></div></div>}
          {hosted.map((ev) => {
            const totalSold = ev.options.reduce((s, o) => s + o.soldCount, 0);
            return (
              <Link key={ev.id} href={`/events/${ev.id}`} className="card event-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>{ev.title}</h3>
                  <span className={`badge ${STATUS_CLASS[ev.status]}`}>{STATUS_LABEL[ev.status]}</span>
                </div>
                <div className="meta-row">
                  <span>누적 판매 {totalSold}개</span>
                  <span
                    role="link"
                    style={{ color: 'var(--accent)', fontWeight: 600 }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/events/new?copy=${ev.id}`; }}
                  >📄 복사해서 열기</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {tab === 'favorites' && (
        <div className="grid-cards">
          {favorites.length === 0 && <div className="empty-state">아직 찜한 공구가 없어요. 공구 상세페이지의 ♡ 버튼을 눌러보세요.</div>}
          {favorites.map((f) => (
            <Link key={f.event.id} href={`/events/${f.event.id}`} className="card event-card">
              {f.event.images?.[0] && (
                <img src={f.event.images[0]} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>{f.event.title}</h3>
                <span className={`badge ${STATUS_CLASS[f.event.status]}`}>{STATUS_LABEL[f.event.status]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
