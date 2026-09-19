'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(23, 59, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [minQuantity, setMinQuantity] = useState(10);
  const [options, setOptions] = useState([{ name: '기본', price: '', stock: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateOption(idx, field, value) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  }
  function addOption() {
    setOptions((prev) => [...prev, { name: '', price: '', stock: '' }]);
  }
  function removeOption(idx) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description, deadline, minQuantity,
        options: options.map((o) => ({ name: o.name, price: o.price, stock: o.stock })),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || '공구 개설에 실패했습니다.');
      return;
    }
    router.push(`/events/${data.event.id}`);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>공구 열기</h1>
          <p>제목, 옵션별 가격/수량, 마감일을 입력하면 바로 개설돼요</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="예: 제주 감귤 5kg 공동구매" />
          </div>
          <div className="field">
            <label>설명 (선택)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="상품 설명, 배송 안내 등" />
          </div>
          <div className="field">
            <label>마감 일시</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          </div>
          <div className="field">
            <label>최소 성사 수량</label>
            <input type="number" min={1} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} required />
          </div>

          <div className="field">
            <label>옵션 (이름 / 가격 / 수량)</label>
            {options.map((o, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input placeholder="옵션명 (예: 빨강/M)" value={o.name} onChange={(e) => updateOption(idx, 'name', e.target.value)} />
                <input type="number" placeholder="가격" value={o.price} onChange={(e) => updateOption(idx, 'price', e.target.value)} style={{ maxWidth: 110 }} />
                <input type="number" placeholder="수량" value={o.stock} onChange={(e) => updateOption(idx, 'stock', e.target.value)} style={{ maxWidth: 90 }} />
                {options.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeOption(idx)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addOption}>+ 옵션 추가</button>
          </div>

          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 10 }}>
            {loading ? '개설 중…' : '공구 개설하기'}
          </button>
        </form>
      </div>
    </>
  );
}
