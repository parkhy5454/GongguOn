'use client';

import { useEffect, useState } from 'react';

const j = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const patch = (body) => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('ko-KR') : '-');

// 공지사항 + 쿠폰 관리
export function AdminPromo() {
  const [anns, setAnns] = useState(null);
  const [coupons, setCoupons] = useState(null);
  const [aTitle, setATitle] = useState('');
  const [aBody, setABody] = useState('');
  const [msg, setMsg] = useState('');
  const [c, setC] = useState({ code: '', type: 'PERCENT', value: '', maxDiscount: '', minOrderAmount: '', maxUses: '', expiresAt: '', description: '' });

  async function load() {
    const [a, b] = await Promise.all([fetch('/api/admin/announcements'), fetch('/api/admin/coupons')]);
    if (a.ok) setAnns((await a.json()).announcements);
    if (b.ok) setCoupons((await b.json()).coupons);
  }
  useEffect(() => { load(); }, []);

  async function addAnn(e) {
    e.preventDefault(); setMsg('');
    const res = await fetch('/api/admin/announcements', j({ title: aTitle, body: aBody }));
    const d = await res.json();
    if (res.ok) { setATitle(''); setABody(''); load(); } else setMsg(d.error || '실패');
  }
  async function toggleAnn(a) { await fetch(`/api/admin/announcements/${a.id}`, patch({ active: !a.active })); load(); }
  async function delAnn(a) { if (confirm('삭제할까요?')) { await fetch(`/api/admin/announcements/${a.id}`, { method: 'DELETE' }); load(); } }

  async function addCoupon(e) {
    e.preventDefault(); setMsg('');
    const res = await fetch('/api/admin/coupons', j(c));
    const d = await res.json();
    if (res.ok) { setC({ ...c, code: '', value: '', maxDiscount: '', minOrderAmount: '', maxUses: '', expiresAt: '', description: '' }); load(); } else setMsg(d.error || '실패');
  }
  async function toggleCoupon(x) { await fetch(`/api/admin/coupons/${x.id}`, patch({ active: !x.active })); load(); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && <p className="error-text">{msg}</p>}
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>📢 공지사항 (활성 공지는 모든 회원 화면 상단에 표시)</h3>
        <form onSubmit={addAnn} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input placeholder="제목 (80자 이내)" value={aTitle} onChange={(e) => setATitle(e.target.value)} required />
          <textarea placeholder="내용 (500자 이내)" rows={2} value={aBody} onChange={(e) => setABody(e.target.value)} required />
          <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>공지 올리기</button>
        </form>
        {anns?.map((a) => (
          <div key={a.id} className="order-row" style={{ flexWrap: 'wrap' }}>
            <span style={{ flex: 1, opacity: a.active ? 1 : 0.5 }}><b>{a.title}</b> — {a.body}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleAnn(a)}>{a.active ? '숨기기' : '다시 표시'}</button>
            <button className="btn btn-danger-outline btn-sm" onClick={() => delAnn(a)}>삭제</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>🎟 쿠폰 (공구온이 부담하는 할인 — 판매자 정산액은 줄지 않아요, 1인 1회)</h3>
        <form onSubmit={addCoupon} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
          <input placeholder="코드 (예: WELCOME10)" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} required />
          <select value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })}>
            <option value="PERCENT">% 할인</option>
            <option value="AMOUNT">정액(원) 할인</option>
          </select>
          <input type="number" placeholder={c.type === 'PERCENT' ? '할인율 (1~90)' : '할인 금액(원)'} value={c.value} onChange={(e) => setC({ ...c, value: e.target.value })} required />
          {c.type === 'PERCENT' && <input type="number" placeholder="최대 할인액(원, 선택)" value={c.maxDiscount} onChange={(e) => setC({ ...c, maxDiscount: e.target.value })} />}
          <input type="number" placeholder="최소 주문금액(선택)" value={c.minOrderAmount} onChange={(e) => setC({ ...c, minOrderAmount: e.target.value })} />
          <input type="number" placeholder="총 사용 한도(선택)" value={c.maxUses} onChange={(e) => setC({ ...c, maxUses: e.target.value })} />
          <input type="date" title="만료일(선택)" value={c.expiresAt} onChange={(e) => setC({ ...c, expiresAt: e.target.value })} />
          <input placeholder="설명(선택)" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
          <button className="btn btn-primary btn-sm">쿠폰 만들기</button>
        </form>
        {coupons?.length === 0 && <div className="empty-state">만든 쿠폰이 없어요.</div>}
        {coupons?.map((x) => (
          <div key={x.id} className="order-row" style={{ flexWrap: 'wrap' }}>
            <span style={{ flex: 1, opacity: x.active ? 1 : 0.5 }}>
              <b>{x.code}</b> · {x.type === 'PERCENT' ? `${x.value}%${x.maxDiscount ? ` (최대 ${x.maxDiscount.toLocaleString()}원)` : ''}` : `${x.value.toLocaleString()}원`}
              {' · '}사용 {x.usedCount}{x.maxUses ? `/${x.maxUses}` : ''}회 · 만료 {fmt(x.expiresAt)}
              {x.minOrderAmount ? ` · ${x.minOrderAmount.toLocaleString()}원 이상` : ''}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleCoupon(x)}>{x.active ? '중지' : '다시 사용'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 후기 관리 (부적절한 후기 숨김)
export function AdminReviews() {
  const [reviews, setReviews] = useState(null);
  async function load() {
    const res = await fetch('/api/admin/reviews');
    if (res.ok) setReviews((await res.json()).reviews);
  }
  useEffect(() => { load(); }, []);
  async function toggle(r) {
    await fetch(`/api/admin/reviews/${r.id}`, patch({ hidden: !r.hidden }));
    load();
  }
  return (
    <div className="card">
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 0 }}>숨긴 후기는 판매자 평점 계산과 화면에서 모두 제외돼요.</p>
      {reviews?.length === 0 && <div className="empty-state">후기가 없어요.</div>}
      {reviews?.map((r) => (
        <div key={r.id} className="order-row" style={{ flexWrap: 'wrap' }}>
          <span style={{ flex: 1, opacity: r.hidden ? 0.5 : 1 }}>
            {'★'.repeat(r.rating)} · {r.reviewer?.name} → {r.target?.name}
            <div style={{ fontSize: 12.5 }}>{r.comment || '(내용 없음)'}</div>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => toggle(r)}>{r.hidden ? '다시 표시' : '숨기기'}</button>
        </div>
      ))}
    </div>
  );
}

export async function toggleVerified(userId, verified) {
  const res = await fetch(`/api/admin/users/${userId}/verify`, patch({ verified }));
  return res.ok;
}
