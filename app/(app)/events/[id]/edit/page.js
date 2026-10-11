'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';
import { compressImage } from '@/lib/imageCompress';

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(true);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('기타');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [minQuantity, setMinQuantity] = useState(1);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/events/${id}`);
      if (res.ok) {
        const d = await res.json();
        if (!d.isHost) {
          router.replace(`/events/${id}`);
          return;
        }
        const ev = d.event;
        setTitle(ev.title);
        setCategory(ev.category);
        setDescription(ev.description || '');
        setImages(ev.images || []);
        const dt = new Date(ev.deadline);
        const pad = (n) => String(n).padStart(2, '0');
        setDeadline(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
        setMinQuantity(ev.minQuantity);
        setLocked((d.orders?.length || 0) > 0);
      } else {
        setError('공구를 불러오지 못했어요.');
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', await compressImage(file));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setImages((prev) => [...prev, data.url]);
    }
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, description, images, deadline, minQuantity }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(d.error || '저장에 실패했습니다.');
      return;
    }
    router.push(`/events/${id}`);
  }

  if (loading) return <div className="empty-state">불러오는 중…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>공구 수정</h1>
          <p>기본 정보는 언제든 수정할 수 있어요. 마감일/최소수량은 참여자가 없을 때만 바뀝니다.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label>카테고리</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.icon} {c.key}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>사진</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {images.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8 }} />
                  <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', fontSize: 10 }}>✕</button>
                </div>
              ))}
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                📷 추가
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
              </label>
            </div>
          </div>
          <div className="field">
            <label>설명</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="field">
            <label>마감 일시 {locked && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(참여자가 있어 수정 불가)</span>}</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={locked} />
          </div>
          <div className="field">
            <label>최소 성사 수량 {locked && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(참여자가 있어 수정 불가)</span>}</label>
            <input type="number" min={1} value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} disabled={locked} />
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>옵션(가격/재고)은 참여자 데이터와 얽혀있어 수정 화면에서는 바꿀 수 없어요.</p>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={saving} style={{ marginTop: 10 }}>
            {saving ? '저장 중…' : '저장하기'}
          </button>
        </form>
      </div>
    </>
  );
}
