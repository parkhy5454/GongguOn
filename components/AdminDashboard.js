'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPromo, AdminReviews, toggleVerified } from '@/components/AdminGrowth';

const TABS = [
  { key: 'users', label: '회원' },
  { key: 'events', label: '공구 현황' },
  { key: 'settlements', label: '정산' },
  { key: 'reports', label: '신고 내역' },
  { key: 'feedback', label: '문의사항' },
  { key: 'promo', label: '공지/쿠폰' },
  { key: 'reviews', label: '후기 관리' },
];

const CATEGORY_LABEL = { BUG: '🐛 버그 신고', SUGGESTION: '💡 기능 제안', OTHER: '💬 기타 문의' };

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };

function formatDT(iso) {
  return new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState(null);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [events, setEvents] = useState(null);
  const [reports, setReports] = useState(null);
  const [feedbacks, setFeedbacks] = useState(null);
  const [settlements, setSettlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  async function loadUsers(page) {
    const res = await fetch(`/api/admin/users?page=${page}`);
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users);
      setUserTotalPages(d.totalPages || 1);
      setUserTotalCount(d.totalCount || 0);
    }
  }

  async function loadSettlements() {
    const res = await fetch('/api/admin/settlements');
    if (res.ok) setSettlements(await res.json());
  }

  async function paySettlement(sellerId) {
    if (!confirm('이 판매자에게 정산금을 지급 처리하시겠어요? (실제 송금은 별도로 진행하시고, 여긴 기록용입니다)')) return;
    setPayingId(sellerId);
    const res = await fetch('/api/admin/settlements/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellerId }),
    });
    setPayingId(null);
    if (res.ok) await loadSettlements();
  }

  useEffect(() => {
    loadUsers(userPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage]);

  useEffect(() => {
    (async () => {
      const [eRes, rRes, fRes] = await Promise.all([
        fetch('/api/admin/events'),
        fetch('/api/admin/reports'),
        fetch('/api/admin/feedback'),
      ]);
      if (eRes.ok) setEvents((await eRes.json()).events);
      if (rRes.ok) setReports((await rRes.json()).reports);
      if (fRes.ok) setFeedbacks((await fRes.json()).feedbacks);
      await loadSettlements();
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'users' && users ? ` (${userTotalCount})` : ''}
            {t.key === 'events' && events ? ` (${events.length})` : ''}
            {t.key === 'settlements' && settlements?.sellers ? ` (${settlements.sellers.length})` : ''}
            {t.key === 'reports' && reports ? ` (${reports.length})` : ''}
            {t.key === 'feedback' && feedbacks ? ` (${feedbacks.length})` : ''}
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
                <th style={{ padding: '6px 8px' }}>휴대폰</th>
                <th style={{ padding: '6px 8px' }}>가입일</th>
                <th style={{ padding: '6px 8px' }}>추천코드</th>
                <th style={{ padding: '6px 8px' }}>포인트</th>
                <th style={{ padding: '6px 8px' }}>개설공구</th>
                <th style={{ padding: '6px 8px' }}>참여주문</th>
                <th style={{ padding: '6px 8px' }}>인증 판매자</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <Link href={`/sellers/${u.id}`} style={{ color: 'var(--accent)' }}>{u.name}</Link>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{u.email}</td>
                  <td style={{ padding: '6px 8px' }}>{u.phone || '-'}</td>
                  <td style={{ padding: '6px 8px' }}>{formatDT(u.createdAt)}</td>
                  <td style={{ padding: '6px 8px' }}>{u.referralCode}</td>
                  <td style={{ padding: '6px 8px' }}>{u.pointBalance.toLocaleString()}P</td>
                  <td style={{ padding: '6px 8px' }}>{u._count.hostedEvents}</td>
                  <td style={{ padding: '6px 8px' }}>{u._count.orders}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <button
                      className={`mini-btn`}
                      onClick={async () => { if (await toggleVerified(u.id, !u.sellerVerified)) loadUsers(userPage); }}
                    >{u.sellerVerified ? '✅ 해제' : '인증하기'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users?.length === 0 && <div className="empty-state">가입한 회원이 없어요.</div>}
          {userTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage <= 1}>← 이전</button>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', alignSelf: 'center' }}>{userPage} / {userTotalPages}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))} disabled={userPage >= userTotalPages}>다음 →</button>
            </div>
          )}
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

      {!loading && tab === 'settlements' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>이미 정산 완료된 금액</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{(settlements?.settledTotal || 0).toLocaleString()}원 ({settlements?.settledCount || 0}건)</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14.5 }}>판매자별 미정산 금액</h3>
              <a className="btn btn-ghost btn-sm" href="/api/admin/settlements/export">⬇️ 전체 정산 내역 CSV</a>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -6 }}>
              카드결제는 결제대행사(토스)를 거쳐 회사 계좌로 모이는 구조라, 실제 송금은 이 목록을 보고 관리자가 직접 처리해야 해요. "지급 처리"는 장부에 완료 표시만 남깁니다.
            </p>
            {(!settlements?.sellers || settlements.sellers.length === 0) && (
              <div className="empty-state">미정산 건이 없어요.</div>
            )}
            {settlements?.sellers?.map((s) => (
              <div key={s.sellerId} className="order-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{s.sellerName} <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 12 }}>({s.sellerEmail})</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{s.orderCount}건 · {s.eventTitles.join(', ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800 }}>{s.totalAmount.toLocaleString()}원</div>
                  <button className="btn btn-primary btn-sm" onClick={() => paySettlement(s.sellerId)} disabled={payingId === s.sellerId} style={{ marginTop: 4 }}>
                    {payingId === s.sellerId ? '처리 중…' : '지급 처리'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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

      {!loading && tab === 'feedback' && (
        <div className="card">
          {feedbacks?.length === 0 && <div className="empty-state">접수된 문의가 없어요.</div>}
          {feedbacks?.map((f) => (
            <div key={f.id} className="order-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{CATEGORY_LABEL[f.category]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {f.user.name} ({f.user.email}) · {formatDT(f.createdAt)}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{f.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && tab === 'promo' && <AdminPromo />}
      {!loading && tab === 'reviews' && <AdminReviews />}
    </>
  );
}
