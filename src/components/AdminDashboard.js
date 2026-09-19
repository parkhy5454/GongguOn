'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const TABS = [
  { key: 'users', label: '회원' },
  { key: 'events', label: '공구 현황' },
  { key: 'reports', label: '신고 내역' },
];

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };

function formatDT(iso) {
  return new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState(null);
  const [events, setEvents] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [uRes, eRes, rRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/events'),
        fetch('/api/admin/reports'),
      ]);
      if (uRes.ok) setUsers((await uRes.json()).users);
      if (eRes.ok) setEvents((await eRes.json()).events);
      if (rRes.ok) setReports((await rRes.json()).reports);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>🛠 관리자</h1>
          <p>회원 · 공구 현황 · 신고 내역을 한눈에 확인해요</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'users' && users ? ` (${users.length})` : ''}
            {t.key === 'events' && events ? ` (${events.length})` : ''}
            {t.key === 'reports' && reports ? ` (${reports.length})` : ''}
          </button>
        ))}
      </div>

      {loading && <div className="empty-state">불러오는 중…</div>}

      {!loading && tab === 'users' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '6px 8px' }}>이름</th>
                <th style={{ padding: '6px 8px' }}>이메일</th>
                <th style={{ padding: '6px 8px' }}>가입일</th>
                <th style={{ padding: '6px 8px' }}>추천코드</th>
                <th style={{ padding: '6px 8px' }}>포인트</th>
                <th style={{ padding: '6px 8px' }}>개설공구</th>
                <th style={{ padding: '6px 8px' }}>참여주문</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <Link href={`/sellers/${u.id}`} style={{ color: 'var(--accent)' }}>{u.name}</Link>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{u.email}</td>
                  <td style={{ padding: '6px 8px' }}>{formatDT(u.createdAt)}</td>
                  <td style={{ padding: '6px 8px' }}>{u.referralCode}</td>
                  <td style={{ padding: '6px 8px' }}>{u.pointBalance.toLocaleString()}P</td>
                  <td style={{ padding: '6px 8px' }}>{u._count.hostedEvents}</td>
                  <td style={{ padding: '6px 8px' }}>{u._count.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users?.length === 0 && <div className="empty-state">가입한 회원이 없어요.</div>}
        </div>
      )}

      {!loading && tab === 'events' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '6px 8px' }}>제목</th>
                <th style={{ padding: '6px 8px' }}>판매자</th>
                <th style={{ padding: '6px 8px' }}>상태</th>
                <th style={{ padding: '6px 8px' }}>참여자</th>
                <th style={{ padding: '6px 8px' }}>확정매출</th>
                <th style={{ padding: '6px 8px' }}>대기금액</th>
                <th style={{ padding: '6px 8px' }}>마감일</th>
              </tr>
            </thead>
            <tbody>
              {events?.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <Link href={`/events/${e.id}`} style={{ color: 'var(--accent)' }}>{e.title}</Link>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{e.hostName}</td>
                  <td style={{ padding: '6px 8px' }}>{STATUS_LABEL[e.status]}</td>
                  <td style={{ padding: '6px 8px' }}>{e.participants}</td>
                  <td style={{ padding: '6px 8px' }}>{e.confirmedRevenue.toLocaleString()}원</td>
                  <td style={{ padding: '6px 8px' }}>{e.pendingRevenue.toLocaleString()}원</td>
                  <td style={{ padding: '6px 8px' }}>{formatDT(e.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events?.length === 0 && <div className="empty-state">개설된 공구가 없어요.</div>}
        </div>
      )}

      {!loading && tab === 'reports' && (
        <div className="card">
          {reports?.length === 0 && <div className="empty-state">접수된 신고가 없어요.</div>}
          {reports?.map((r) => (
            <div key={r.id} className="order-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.reason}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  <Link href={`/events/${r.event.id}`} style={{ color: 'var(--accent)' }}>{r.event.title}</Link>
                  {' · 판매자 '}{r.event.host.name} ({r.event.host.email})
                  {' · 신고자 '}{r.reporter.name} ({r.reporter.email})
                  {' · '}{formatDT(r.createdAt)}
                </div>
                {r.detail && <div style={{ fontSize: 13, marginTop: 4 }}>{r.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
