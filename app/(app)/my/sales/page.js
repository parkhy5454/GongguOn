'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const won = (n) => `${(n || 0).toLocaleString()}원`;

export default function SalesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/my/sales');
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="empty-state">불러오는 중…</div>;
  if (!data) return <div className="empty-state">매출 정보를 불러오지 못했어요.</div>;
  const { total, events } = data;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>내 매출·정산</h1>
          <p>결제가 확정된 주문 기준이에요. 정산 완료 여부는 운영팀이 정산을 처리하면 반영돼요.</p>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: 20 }}>
        <div className="card"><div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>확정 매출</div><div style={{ fontSize: 20, fontWeight: 800 }}>{won(total.confirmedAmount)}</div></div>
        <div className="card"><div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>정산 완료</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{won(total.settledAmount)}</div></div>
        <div className="card"><div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>정산 대기</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{won(total.unsettledAmount)}</div></div>
        <div className="card"><div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>입금 대기(미확정)</div><div style={{ fontSize: 20, fontWeight: 800 }}>{won(total.pendingAmount)}</div></div>
      </div>

      <div className="card">
        {events.length === 0 && (
          <div className="empty-state">아직 개설한 공구가 없어요.<div style={{ marginTop: 10 }}><Link href="/events/new" className="btn btn-primary btn-sm">첫 공구 열기</Link></div></div>
        )}
        {events.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`} className="order-row" style={{ textDecoration: 'none', color: 'inherit', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 180 }}>
              <b>{e.title}</b> <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>({STATUS_LABEL[e.status]})</span>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                주문 {e.orderCount}건 · 확정 {e.confirmedCount}건{e.refundedCount ? ` · 환불 ${e.refundedCount}건` : ''}
              </div>
            </span>
            <span style={{ fontSize: 12.5, textAlign: 'right' }}>
              매출 <b>{won(e.confirmedAmount)}</b><br />
              <span style={{ color: 'var(--text-dim)' }}>정산대기 {won(e.unsettledAmount)}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
