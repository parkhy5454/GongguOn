'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

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

const RECENT_KEY = 'gonggu-on:recent-searches';

function loadRecent() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveRecent(list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('new');
  const [category, setCategory] = useState('ALL');
  const [showSuggest, setShowSuggest] = useState(false);
  const [recent, setRecent] = useState([]);
  const [popular, setPopular] = useState([]);

  useEffect(() => {
    setRecent(loadRecent());
    (async () => {
      const res = await fetch('/api/search/popular');
      if (res.ok) setPopular((await res.json()).popular);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      params.set('sort', sort);
      if (category !== 'ALL') params.set('category', category);
      const res = await fetch(`/api/events?${params.toString()}`);
      if (res.ok) setEvents((await res.json()).events);
      setLoading(false);
      if (q.trim()) {
        const next = [q.trim(), ...recent.filter((r) => r !== q.trim())];
        setRecent(next);
        saveRecent(next);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, category]);

  function applySearch(term) {
    setQ(term);
    setShowSuggest(false);
  }

  function clearRecent() {
    setRecent([]);
    saveRecent([]);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>공동구매</h1>
        </div>
      </div>

      <div className="events-filter-row" style={{ display: 'flex', gap: 8, marginBottom: 16, position: 'relative' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          placeholder="🔍 검색"
          style={{ maxWidth: 260 }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="new">최신순</option>
          <option value="deadline">마감임박순</option>
          <option value="popular">인기순</option>
        </select>

        {showSuggest && (recent.length > 0 || popular.length > 0) && (
          <div className="card" style={{ position: 'absolute', top: 44, left: 0, width: 280, zIndex: 20, padding: 12 }}>
            {recent.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 4 }}>
                  <span>최근 검색어</span>
                  <button type="button" onClick={clearRecent} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 11 }}>지우기</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {recent.map((r) => (
                    <button key={r} type="button" className="mini-btn" onMouseDown={() => applySearch(r)}>{r}</button>
                  ))}
                </div>
              </div>
            )}
            {popular.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 4 }}>🔥 인기 검색어</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {popular.map((p) => (
                    <button key={p} type="button" className="mini-btn" onMouseDown={() => applySearch(p)}>{p}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 18, paddingBottom: 4 }}>
        <button
          className={`btn btn-sm ${category === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setCategory('ALL')}
          style={{ flexShrink: 0 }}
        >
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`btn btn-sm ${category === c.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCategory(c.key)}
            style={{ flexShrink: 0 }}
          >
            {c.icon} {c.key}
          </button>
        ))}
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
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{CATEGORIES.find((c) => c.key === ev.category)?.icon} {ev.category}</div>
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
