'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const STATUS_CLASS = { OPEN: 'badge-open', CLOSED: 'badge-closed', CANCELLED: 'badge-cancelled', COMPLETED: 'badge-completed' };

function formatDeadline(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d - now;
  const dateStr = d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (diffMs <= 0) return `${dateStr} (마감)`;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${dateStr} · ${hours}시간 남음`;
  return `${dateStr} · ${Math.floor(hours / 24)}일 남음`;
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/events');
      if (res.ok) setEvents((await res.json()).events);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>공구 둘러보기</h1>
          <p>지금 열려있는 공동구매를 확인하고 참여해보세요</p>
        </div>
        <Link href="/events/new" className="btn btn-primary">+ 공구 열기</Link>
      </div>

      {loading && <div className="empty-state">불러오는 중…</div>}
      {!loading && events.length === 0 && (
        <div className="empty-state">아직 열린 공구가 없어요. 첫 공구를 열어보세요!</div>
      )}

      <div className="grid-cards">
        {events.map((ev) => {
          const minPrice = ev.options.length ? Math.min(...ev.options.map((o) => o.price)) : 0;
          const totalStock = ev.options.reduce((sum, o) => sum + o.stock, 0);
          const totalSold = ev.options.reduce((sum, o) => sum + o.soldCount, 0);
          const pct = totalStock ? Math.min(100, Math.round((totalSold / totalStock) * 100)) : 0;
          return (
            <Link key={ev.id} href={`/events/${ev.id}`} className="card event-card">
              {ev.images?.[0] && (
                <img
                  src={ev.images[0]}
                  alt=""
                  style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 4 }}
                />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3>{ev.title}</h3>
                <span className={`badge ${STATUS_CLASS[ev.status]}`}>{STATUS_LABEL[ev.status]}</span>
              </div>
              {ev.description && <div className="desc">{ev.description}</div>}
              <div className="price">{minPrice.toLocaleString()}원~</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
              <div className="meta-row">
                <span>
                  {ev.host.name}
                  {ev.hostRating?.avg ? ` · ⭐ ${ev.hostRating.avg.toFixed(1)} (${ev.hostRating.count})` : ' · 신규 판매자'}
                </span>
                <span>{formatDeadline(ev.deadline)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
