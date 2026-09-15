'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function formatTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/decisions');
      if (res.ok) setDecisions((await res.json()).decisions);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>📌 결정 로그</h1>
          <p>채널 전체에서 "결정으로 표시"된 메시지 모음</p>
        </div>
      </div>
      <div className="content">
        <div className="card">
          {loading && <div className="empty-state">불러오는 중…</div>}
          {!loading && decisions.length === 0 && (
            <div className="empty-state">아직 표시된 결정이 없습니다. 채널에서 메시지를 "결정으로 표시"해보세요.</div>
          )}
          {decisions.map((d) => (
            <div key={d.id} className="todo-row" style={{ alignItems: 'flex-start' }}>
              <span className="decision-tag" style={{ marginTop: 3 }}>📌</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{d.content}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  <Link href={`/dashboard/channel/${d.channel.id}`} style={{ color: 'var(--accent)' }}>
                    # {d.channel.name}
                  </Link>
                  {' · '}{d.author?.name} · {formatTime(d.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
