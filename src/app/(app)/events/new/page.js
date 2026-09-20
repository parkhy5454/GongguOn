'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';

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
  const [category, setCategory] = useState('식품');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [minQuantity, setMinQuantity] = useState(10);
  const [options, setOptions] = useState([{ name: '기본', price: '', stock: '' }]);
  const [discountTiers, setDiscountTiers] = useState([]);
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [images, setImages] = useState([]); // { url, uploading }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const placeholders = files.map((f) => ({ id: `${Date.now()}-${Math.random()}`, url: null, preview: URL.createObjectURL(f), uploading: true, error: false }));
    setImages((prev) => [...prev, ...placeholders]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const placeholderId = placeholders[i].id;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          setImages((prev) => prev.map((img) => (img.id === placeholderId ? { ...img, url: data.url, uploading: false } : img)));
        } else {
          setImages((prev) => prev.map((img) => (img.id === placeholderId ? { ...img, uploading: false, error: true } : img)));
        }
      } catch {
        setImages((prev) => prev.map((img) => (img.id === placeholderId ? { ...img, uploading: false, error: true } : img)));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function generateWithAI() {
    const firstReady = images.find((img) => img.url);
    if (!firstReady) return;
    setAiLoading(true);
    setAiMsg('');
    try {
      const res = await fetch('/api/ai/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: firstReady.url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiMsg(data.error || 'AI 자동 작성에 실패했어요.');
      } else {
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        setAiMsg('AI가 작성한 내용이에요. 필요하면 자유롭게 수정하세요.');
      }
    } catch {
      setAiMsg('AI 자동 작성 중 오류가 발생했어요.');
    }
    setAiLoading(false);
  }

  function updateOption(idx, field, value) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  }
  function addOption() {
    setOptions((prev) => [...prev, { name: '', price: '', stock: '' }]);
  }
  function removeOption(idx) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  const optionImageInputRef = useRef(null);
  const [optionImageTargetIdx, setOptionImageTargetIdx] = useState(null);
  const [optionImageUploading, setOptionImageUploading] = useState(null);

  function triggerOptionImageUpload(idx) {
    setOptionImageTargetIdx(idx);
    optionImageInputRef.current?.click();
  }

  async function handleOptionImageChange(e) {
    const file = e.target.files?.[0];
    const idx = optionImageTargetIdx;
    if (!file || idx === null) return;
    setOptionImageUploading(idx);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) updateOption(idx, 'imageUrl', data.url);
    setOptionImageUploading(null);
    if (optionImageInputRef.current) optionImageInputRef.current.value = '';
  }

  function updateTier(idx, field, value) {
    setDiscountTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  }
  function addTier() {
    setDiscountTiers((prev) => [...prev, { minParticipants: '', discountPercent: '' }]);
  }
  function removeTier(idx) {
    setDiscountTiers((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (images.some((img) => img.uploading)) {
      setError('사진 업로드가 끝날 때까지 잠시만 기다려주세요.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description, deadline, minQuantity, category,
        images: images.filter((img) => img.url).map((img) => img.url),
        options: options.map((o) => ({ name: o.name, price: o.price, stock: o.stock, imageUrl: o.imageUrl })),
        discountTiers: discountTiers.filter((t) => t.minParticipants && t.discountPercent),
        aiAutoReply,
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
          <h1>공구 등록</h1>
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
            <label>카테고리</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.icon} {c.key}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>상품 사진 (선택, 최대 6장)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {images.map((img) => (
                <div key={img.id} style={{ position: 'relative', width: 84, height: 84 }}>
                  <img
                    src={img.url || img.preview}
                    alt=""
                    style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', opacity: img.uploading ? 0.5 : 1 }}
                  />
                  {img.uploading && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
                      업로드중…
                    </span>
                  )}
                  {img.error && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, color: 'var(--danger)', background: 'rgba(255,255,255,0.85)', borderRadius: 8 }}>
                      실패
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', fontSize: 11, lineHeight: 1 }}
                  >✕</button>
                </div>
              ))}
              {images.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 84, height: 84, borderRadius: 8, border: '1px dashed var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-dim)', fontSize: 24, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  📷
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              style={{ display: 'none' }}
              onChange={handleFiles}
            />
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0 }}>
              📷 버튼을 누르면 휴대폰에서 바로 사진을 찍거나 앨범에서 여러 장 선택할 수 있어요.
            </p>
            {images.some((img) => img.url) && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={generateWithAI} disabled={aiLoading}>
                  {aiLoading ? '✨ AI가 작성 중…' : '✨ 사진으로 AI 자동 작성'}
                </button>
                {aiMsg && (
                  <p style={{ fontSize: 11.5, marginTop: 4, color: aiMsg.includes('실패') || aiMsg.includes('오류') ? 'var(--danger)' : 'var(--text-dim)' }}>
                    {aiMsg}
                  </p>
                )}
              </div>
            )}
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
            <label>옵션 (이름 / 가격 / 수량 / 사진)</label>
            <input
              ref={optionImageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleOptionImageChange}
            />
            {options.map((o, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => triggerOptionImageUpload(idx)}
                  style={{
                    width: 34, height: 34, flexShrink: 0, borderRadius: 6, border: '1px solid var(--border)',
                    background: o.imageUrl ? `url(${o.imageUrl}) center/cover` : 'var(--bg-input)',
                    fontSize: 13, color: 'var(--text-dim)',
                  }}
                  title="옵션 사진"
                >
                  {optionImageUploading === idx ? '⏳' : !o.imageUrl ? '📷' : ''}
                </button>
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

          <div className="field">
            <label>🔥 참여인원 할인 (선택 — 핀둬둬처럼 사람이 모일수록 가격이 내려가요)</label>
            {discountTiers.map((t, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <input
                  type="number" min={2} placeholder="인원 수 (예: 5)"
                  value={t.minParticipants}
                  onChange={(e) => updateTier(idx, 'minParticipants', e.target.value)}
                />
                <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>명 이상 →</span>
                <input
                  type="number" min={1} max={90} placeholder="할인율 (예: 10)"
                  value={t.discountPercent}
                  onChange={(e) => updateTier(idx, 'discountPercent', e.target.value)}
                  style={{ maxWidth: 110 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>%</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeTier(idx)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addTier}>+ 할인 구간 추가</button>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '6px 0 0' }}>
              예: 5명 이상 → 10%, 10명 이상 → 20% 처럼 여러 구간을 만들 수 있어요. 참여자가 늘어날수록 이후 참여자들에게 자동으로 더 싼 가격이 적용돼요.
            </p>
          </div>

          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox" id="aiAutoReply" checked={aiAutoReply}
              onChange={(e) => setAiAutoReply(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="aiAutoReply" style={{ color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              🤖 채팅에서 AI가 자주 묻는 질문에 자동으로 답해주기
            </label>
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
