'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const STATUS_CLASS = { OPEN: 'badge-open', CLOSED: 'badge-closed', CANCELLED: 'badge-cancelled', COMPLETED: 'badge-completed' };
const PAY_LABEL = { PENDING: '입금 대기', PAID: '입금 확인 요청', CONFIRMED: '입금 확인됨' };

export default function MyPage() {
  const [me, setMe] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [meRes, evRes] = await Promise.all([fetch('/api/me'), fetch('/api/events')]);
      if (meRes.ok) setMe((await meRes.json()).user);
      if (evRes.ok) setEvents((await evRes.json()).events);
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
          친구가 내 초대 링크로 가입 후 첫 구매/첫 공구를 열면 포인트가 쌓여요. 상단 "🎁 친구 초대" 버튼을 눌러보세요.
        </div>
      </div>

      <h3 style={{ fontSize: 15 }}>내가 개설한 공구</h3>
      {hosted.length === 0 && <div className="empty-state">아직 개설한 공구가 없어요.</div>}
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        {hosted.map((ev) => {
          const totalSold = ev.options.reduce((s, o) => s + o.soldCount, 0);
          return (
            <Link key={ev.id} href={`/events/${ev.id}`} className="card event-card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>{ev.title}</h3>
                <span className={`badge ${STATUS_CLASS[ev.status]}`}>{STATUS_LABEL[ev.status]}</span>
              </div>
              <div className="meta-row"><span>누적 판매 {totalSold}개</span></div>
            </Link>
          );
        })}
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
        참여한 공구의 결제 상태는 각 공구 상세 페이지에서 확인/관리할 수 있어요. 아래 "공구 둘러보기"에서 참여했던 공구를 찾아 들어가보세요.
      </p>
      <Link href="/events" className="btn btn-ghost" style={{ marginTop: 8 }}>공구 둘러보기로 이동</Link>
    </>
  );
}
