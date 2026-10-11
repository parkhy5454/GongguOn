'use client';
import { useEffect, useState } from 'react';

export default function AnnouncementBanner({ items }) {
  const [hidden, setHidden] = useState(null);
  useEffect(() => {
    try {
      setHidden(JSON.parse(localStorage.getItem('gg_ann_dismissed') || '[]'));
    } catch { setHidden([]); }
  }, []);
  if (hidden === null) return null;
  const list = (items || []).filter((a) => !hidden.includes(a.id));
  if (!list.length) return null;
  function dismiss(id) {
    const next = [...hidden, id];
    setHidden(next);
    try { localStorage.setItem('gg_ann_dismissed', JSON.stringify(next.slice(-50))); } catch {}
  }
  return (
    <div>
      {list.map((a) => (
        <div key={a.id} style={{ background: '#fff7e6', color: '#8a5a00', fontSize: 13, padding: '10px 20px', display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          <span>📢 <b>{a.title}</b>{a.body ? ` — ${a.body}` : ''}</span>
          <button onClick={() => dismiss(a.id)} aria-label="닫기" style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>✕</button>
        </div>
      ))}
    </div>
  );
}
