'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const STATUS_CLASS = { OPEN: 'badge-open', CLOSED: 'badge-closed', CANCELLED: 'badge-cancelled', COMPLETED: 'badge-completed' };
const DELIVERY_LABEL = { PREPARING: '상품 준비중', SHIPPING: '배송중', DONE: '배송 완료' };
const PAY_LABEL = { PENDING: '입금 대기', PAID: '입금 확인 요청', CONFIRMED: '입금 확인됨' };

function formatDT(iso) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EventDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedOption, setSelectedOption] = useState(null);
  const [qty, setQty] = useState(1);
  const [joining, setJoining] = useState(false);

  const [depositorName, setDepositorName] = useState('');
  const [paying, setPaying] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  async function loadEvent() {
    const res = await fetch(`/api/events/${id}`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      if (!selectedOption && d.event.options.length) setSelectedOption(d.event.options[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEvent();

    (async () => {
      const res = await fetch(`/api/events/${id}/messages`);
      if (res.ok) setMessages((await res.json()).messages);
    })();

    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;
    socket.emit('join-event', id);

    socket.on('new-message', (msg) => setMessages((prev) => [...prev, msg]));
    socket.on('order-updated', () => loadEvent());
    socket.on('order-created', () => loadEvent());
    socket.on('event-updated', () => loadEvent());

    return () => {
      socket.emit('leave-event', id);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function joinEvent(e) {
    e.preventDefault();
    setError('');
    setJoining(true);
    const res = await fetch(`/api/events/${id}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId: selectedOption, quantity: qty }),
    });
    const d = await res.json();
    setJoining(false);
    if (!res.ok) {
      setError(d.error || '참여에 실패했습니다.');
      return;
    }
    await loadEvent();
  }

  async function markPaid(e) {
    e.preventDefault();
    if (!data?.myOrder) return;
    setPaying(true);
    const res = await fetch(`/api/orders/${data.myOrder.id}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositorName }),
    });
    setPaying(false);
    if (res.ok) await loadEvent();
  }

  async function confirmOrder(orderId) {
    const res = await fetch(`/api/orders/${orderId}/confirm`, { method: 'PATCH' });
    if (res.ok) await loadEvent();
  }

  async function changeStatus(status) {
    const res = await fetch(`/api/events/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await loadEvent();
  }

  async function changeDelivery(deliveryStatus) {
    const res = await fetch(`/api/events/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryStatus }),
    });
    if (res.ok) await loadEvent();
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatText.trim()) return;
    await fetch(`/api/events/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: chatText.trim() }),
    });
    setChatText('');
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewSaving(true);
    setReviewMsg('');
    const res = await fetch(`/api/events/${id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
    });
    const d = await res.json();
    setReviewSaving(false);
    if (!res.ok) {
      setReviewMsg(d.error || '후기 등록에 실패했습니다.');
      return;
    }
    setReviewMsg('후기가 등록됐어요. 감사합니다!');
    await loadEvent();
  }

  if (loading) return <div className="empty-state">불러오는 중…</div>;
  if (!data) return <div className="empty-state">공구를 찾을 수 없어요.</div>;

  const { event, isHost, myOrder, orders, hostRating, totalParticipants } = data;
  const option = event.options.find((o) => o.id === selectedOption);
  const remaining = option ? option.stock - option.soldCount : 0;
  const deadlinePassed = new Date(event.deadline) < new Date();
  const canJoin = event.status === 'OPEN' && !deadlinePassed && !isHost && !myOrder;
  const canReview = !isHost && myOrder?.paymentStatus === 'CONFIRMED' && event.status === 'COMPLETED';

  return (
    <>
      <div className="page-header">
        <div>
          <span className={`badge ${STATUS_CLASS[event.status]}`} style={{ marginBottom: 8, display: 'inline-block' }}>
            {STATUS_LABEL[event.status]}
          </span>
          <h1>{event.title}</h1>
          <p>
            {event.host.name}
            {hostRating.avg ? ` · ⭐ ${hostRating.avg.toFixed(1)} (${hostRating.count}건)` : ' · 신규 판매자'}
            {' · 마감 '}{formatDT(event.deadline)}
            {' · '}{DELIVERY_LABEL[event.deliveryStatus]}
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            {event.images?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
                {event.images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    style={{ height: 180, borderRadius: 10, border: '1px solid var(--border)', flexShrink: 0 }}
                  />
                ))}
              </div>
            )}
            {event.description && <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 0 }}>{event.description}</p>}
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>최소 성사 수량: {event.minQuantity}개</p>

            {!isHost && (
              <>
                <div style={{ marginTop: 10 }}>
                  {event.options.map((o) => {
                    const rem = o.stock - o.soldCount;
                    return (
                      <div
                        key={o.id}
                        className={`option-row ${selectedOption === o.id ? 'selected' : ''}`}
                        onClick={() => canJoin && setSelectedOption(o.id)}
                        style={{ cursor: canJoin ? 'pointer' : 'default', opacity: rem <= 0 ? 0.5 : 1 }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                            {o.price.toLocaleString()}원 · 남은 수량 {Math.max(0, rem)}개
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {canJoin && option && (
                  <form onSubmit={joinEvent} style={{ marginTop: 12 }}>
                    <div className="qty-control" style={{ marginBottom: 10 }}>
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => setQty((q) => Math.min(remaining, q + 1))}>+</button>
                      <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-dim)' }}>
                        합계 {(option.price * qty).toLocaleString()}원
                      </span>
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    <button className="btn btn-primary btn-block" type="submit" disabled={joining || remaining < 1}>
                      {remaining < 1 ? '품절' : joining ? '참여 중…' : '공구 참여하기'}
                    </button>
                  </form>
                )}

                {myOrder && (
                  <div className="card" style={{ marginTop: 12, background: 'var(--bg-input)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                      <span>내 주문: {myOrder.option.name} × {myOrder.quantity}개</span>
                      <span className={`status-pill status-${myOrder.paymentStatus}`}>{PAY_LABEL[myOrder.paymentStatus]}</span>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>결제 금액: {myOrder.amount.toLocaleString()}원</div>
                    {myOrder.paymentStatus === 'PENDING' && (
                      <form onSubmit={markPaid} style={{ display: 'flex', gap: 6 }}>
                        <input
                          placeholder="입금자명"
                          value={depositorName}
                          onChange={(e) => setDepositorName(e.target.value)}
                          required
                        />
                        <button className="btn btn-primary btn-sm" type="submit" disabled={paying}>
                          {paying ? '처리 중…' : '입금완료 표시'}
                        </button>
                      </form>
                    )}
                    {myOrder.paymentStatus === 'PAID' && (
                      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>
                        입금자명 "{myOrder.depositorName}" — 판매자 확인을 기다리는 중이에요.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {isHost && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 13 }}>
                  {event.options.map((o) => (
                    <div key={o.id}>
                      <div style={{ fontWeight: 600 }}>{o.name}</div>
                      <div style={{ color: 'var(--text-dim)' }}>{o.price.toLocaleString()}원 · {o.soldCount}/{o.stock}개 판매</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>참여자 {totalParticipants ?? 0}명 · 총 주문 {orders?.length ?? 0}건</p>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {event.status === 'OPEN' && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => changeStatus('CLOSED')}>마감 처리</button>
                      <button className="btn btn-danger-outline btn-sm" onClick={() => changeStatus('CANCELLED')}>공구 취소</button>
                    </>
                  )}
                  {event.status === 'CLOSED' && (
                    <button className="btn btn-primary btn-sm" onClick={() => changeStatus('COMPLETED')}>완료 처리 (후기 받기 시작)</button>
                  )}
                  {event.status !== 'CANCELLED' && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => changeDelivery('PREPARING')}>준비중</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => changeDelivery('SHIPPING')}>배송중</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => changeDelivery('DONE')}>배송완료</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {isHost && (
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: 14.5 }}>주문 / 정산 현황</h3>
              {(!orders || orders.length === 0) && <div className="empty-state">아직 참여자가 없어요.</div>}
              {orders?.map((o) => (
                <div key={o.id} className="order-row">
                  <span style={{ flex: 1 }}>{o.buyer.name} · {o.option.name} × {o.quantity}개 · {o.amount.toLocaleString()}원</span>
                  <span className={`status-pill status-${o.paymentStatus}`}>{PAY_LABEL[o.paymentStatus]}</span>
                  {o.paymentStatus === 'PAID' && (
                    <button className="btn btn-primary btn-sm" onClick={() => confirmOrder(o.id)}>입금 확인</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canReview && (
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: 14.5 }}>판매자 후기 남기기</h3>
              <form onSubmit={submitReview}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setReviewRating(n)}
                      style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: n <= reviewRating ? '#e0a94b' : '#ddd' }}
                    >★</button>
                  ))}
                </div>
                <textarea placeholder="후기를 남겨주세요 (선택)" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={2} />
                {reviewMsg && <p style={{ fontSize: 12.5, color: reviewMsg.includes('등록됐어요') ? 'var(--success)' : 'var(--danger)' }}>{reviewMsg}</p>}
                <button className="btn btn-primary btn-sm" type="submit" disabled={reviewSaving} style={{ marginTop: 6 }}>
                  {reviewSaving ? '등록 중…' : '후기 등록'}
                </button>
              </form>
            </div>
          )}

          {event.reviews?.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: 14.5 }}>구매자 후기 ({event.reviews.length})</h3>
              {event.reviews.map((r) => (
                <div key={r.id} className="review-row">
                  <div className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.reviewer.name}</div>
                  {r.comment && <div style={{ marginTop: 3 }}>{r.comment}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chat-panel">
          <div className="chat-messages">
            {messages.length === 0 && <div className="empty-state" style={{ padding: 20 }}>아직 대화가 없어요. 질문을 남겨보세요.</div>}
            {messages.map((m) => (
              <div key={m.id} className="chat-msg">
                <span className="who">{m.author.name}</span>
                {m.content}
                <span className="time">{formatDT(m.createdAt)}</span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          <form className="chat-input" onSubmit={sendChat}>
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="질문을 입력하세요"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChat(e);
                }
              }}
            />
            <button className="btn btn-primary btn-sm" type="submit">전송</button>
          </form>
        </div>
      </div>
    </>
  );
}
