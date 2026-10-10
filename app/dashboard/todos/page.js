'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { OPEN: '할 일', IN_PROGRESS: '진행 중', DONE: '완료' };
const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'DONE'];

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function TodosPage() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/todos');
    if (res.ok) setTodos((await res.json()).todos);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function cycleStatus(todo) {
    const currentIdx = STATUS_ORDER.indexOf(todo.status);
    const next = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      const { todo: updated } = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>✅ 할 일</h1>
          <p>메시지에서 전환된 팀 할 일 목록</p>
        </div>
      </div>
      <div className="content">
        <div className="card">
          {loading && <div className="empty-state">불러오는 중…</div>}
          {!loading && todos.length === 0 && (
            <div className="empty-state">아직 할 일이 없습니다. 채널에서 메시지를 "할 일로 전환"해보세요.</div>
          )}
          {todos.map((t) => (
            <div key={t.id} className="todo-row">
              <button
                className={`status-pill status-${t.status}`}
                onClick={() => cycleStatus(t)}
                style={{ border: 'none', cursor: 'pointer' }}
                title="클릭해서 상태 변경"
              >
                {STATUS_LABEL[t.status]}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  <Link href={`/dashboard/channel/${t.channel.id}`} style={{ color: 'var(--accent)' }}>
                    # {t.channel.name}
                  </Link>
                  {' · '}담당 {t.assignee?.name || '미지정'}
                  {t.dueDate && ` · 기한 ${formatDate(t.dueDate)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
