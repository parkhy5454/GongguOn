'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedOption, setSelectedOption] = useState(null);
  const [qty, setQty] = useState(1);
  const [joining, setJoining] = useState(false);
  const [useMyPoints, setUseMyPoints] = useState(false);
  const [myPointBalance, setMyPointBalance] = useState(0);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  const [depositorName, setDepositorName] = useState('');
  const [paying, setPaying] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatImage, setChatImage] = useState(null); // { url, uploading }
  const chatFileInputRef = useRef(null);
  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('상품 미배송/먹튀 의심');
  const [reportDetail, setReportDetail] = useState('');
  const [reportSaving, setReportSaving] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  const [reminding, setReminding] = useState(false);
  const [remindMsg, setRemindMsg] = useState('');
  const [trackingInputs, setTrackingInputs] = useState({}); // orderId -> {company, number}

  function setTracking(orderId, field, value) {
    setTrackingInputs((prev) => ({ ...prev, [orderId]: { ...prev[orderId], [field]: value } }));
  }

  async function saveTracking(orderId) {
    const t = trackingInputs[orderId] || {};
    const res = await fetch(`/api/orders/${orderId}/tracking`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingCompany: t.company, trackingNumber: t.number }),
    });
    if (res.ok) await loadEvent();
  }

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
      const meRes = await fetch('/api/me');
      if (meRes.ok) {
        const me = (await meRes.json()).user;
        setMyPointBalance(me.pointBalance || 0);
        if (me.defaultAddress) setShippingAddress(me.defaultAddress);
      }
    })();

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
      body: JSON.stringify({ optionId: selectedOption, quantity: qty, usePoints: useMyPoints, shippingAddress, paymentMethod }),
    });
    const d = await res.json();
    if (!res.ok) {
      setJoining(false);
      setError(d.error || '참여에 실패했습니다.');
      return;
    }
    if (paymentMethod === 'CARD') {
      // 토스 결제창으로 이동 (계좌이체는 바로 완료, 카드는 결제창을 거쳐야 함)
      router.push(`/checkout/${d.order.id}`);
      return;
    }
    setJoining(false);
    setUseMyPoints(false);
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

  async function handleChatImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatImage({ url: null, uploading: true });
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) {
      setChatImage({ url: data.url, uploading: false });
    } else {
      setChatImage(null);
    }
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatText.trim() && !chatImage?.url) return;
    if (chatImage?.uploading) return;
    await fetch(`/api/events/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: chatText.trim(), imageUrl: chatImage?.url || null }),
    });
    setChatText('');
    setChatImage(null);
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

  async function submitReport(e) {
    e.preventDefault();
    setReportSaving(true);
    setReportMsg('');
    const res = await fetch(`/api/events/${id}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportReason, detail: reportDetail }),
    });
    const d = await res.json();
    setReportSaving(false);
    if (!res.ok) {
      setReportMsg(d.error || '신고 접수에 실패했습니다.');
      return;
    }
    setReportMsg('신고가 접수됐어요. 확인 후 조치할게요.');
    setReportDetail('');
  }

  async function sendReminder() {
    setReminding(true);
    setRemindMsg('');
    const res = await fetch(`/api/events/${id}/remind`, { method: 'POST' });
    const d = await res.json();
    setReminding(false);
    setRemindMsg(res.ok ? `${d.sent}명에게 입금 리마인드를 보냈어요.` : d.error || '전송에 실패했습니다.');
  }

  async function cancelPendingCardOrder() {
    if (!confirm('참여를 취소하시겠어요? 잡아둔 재고와 사용한 포인트가 돌아갑니다.')) return;
    const res = await fetch('/api/payments/cancel-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: data.myOrder.id }),
    });
    if (res.ok) await loadEvent();
  }

  if (loading) return <div className="empty-state">불러오는 중…</div>;
  if (!data) return <div className="empty-state">공구를 찾을 수 없어요.</div>;

  const { event, isHost, myOrder, orders, hostRating, totalParticipants, currentParticipants, currentDiscount, nextTier } = data;
  const option = event.options.find((o) => o.id === selectedOption);
  const remaining = option ? option.stock - option.soldCount : 0;
  const deadlinePassed = new Date(event.deadline) < new Date();
  const canJoin = event.status === 'OPEN' && !deadlinePassed && !isHost && !myOrder;
  const canReview = !isHost && myOrder?.paymentStatus === 'CONFIRMED' && event.status === 'COMPLETED';
  // 지금 참여하면 몇 번째 참여자가 되는지 기준으로, 내가 실제로 받게 될 할인율을 계산 (서버 계산 방식과 동일)
  const myJoinDiscount = (event.discountTiers || [])
    .filter((t) => (currentParticipants || 0) + 1 >= t.minParticipants)
    .reduce((max, t) => Math.max(max, t.discountPercent), 0);
  const discountedUnitPrice = option ? Math.round(option.price * (1 - myJoinDiscount / 100)) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <span className={`badge ${STATUS_CLASS[event.status]}`} style={{ marginBottom: 8, display: 'inline-block' }}>
            {STATUS_LABEL[event.status]}
          </span>
          <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-dim)' }}>{event.category}</span>
          <h1>{event.title}</h1>
          <p>
            <Link href={`/sellers/${event.host.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{event.host.name}</Link>
            {hostRating.avg ? ` · ⭐ ${hostRating.avg.toFixed(1)} (${hostRating.count}건)` : ' · 신규 판매자'}
            {' · 마감 '}{formatDT(event.deadline)}
            {' · '}{DELIVERY_LABEL[event.deliveryStatus]}
          </p>
          {!isHost && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)} style={{ marginTop: 6 }}>🚨 신고하기</button>
          )}
        </div>
      </div>

      {event.discountTiers?.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--accent-soft)', border: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
            🔥 지금 {currentParticipants}명 참여 중 {currentDiscount > 0 ? `· 현재 ${currentDiscount}% 할인 적용가` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {event.discountTiers
              .slice()
              .sort((a, b) => a.minParticipants - b.minParticipants)
              .map((t) => `${t.minParticipants}명 이상 ${t.discountPercent}%`)
              .join(' · ')}
            {nextTier && ` · 다음 할인까지 ${nextTier.minParticipants - currentParticipants}명 남음`}
          </div>
        </div>
      )}

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
                            {myJoinDiscount > 0 ? (
                              <>
                                <span style={{ textDecoration: 'line-through', marginRight: 4 }}>{o.price.toLocaleString()}원</span>
                                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{Math.round(o.price * (1 - myJoinDiscount / 100)).toLocaleString()}원</span>
                              </>
                            ) : (
                              `${o.price.toLocaleString()}원`
                            )}
                            {' · 남은 수량 '}{Math.max(0, rem)}개
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
                        상품 금액 {(discountedUnitPrice * qty).toLocaleString()}원
                        {myJoinDiscount > 0 && ` (${myJoinDiscount}% 할인 적용)`}
                      </span>
                    </div>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label>배송지 주소</label>
                      <textarea
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        rows={2}
                        required
                        placeholder="예: 서울시 강남구 테헤란로 123, 101동 1001호"
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label>결제 수단</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <input type="radio" name="pm" checked={paymentMethod === 'CARD'} onChange={() => setPaymentMethod('CARD')} style={{ width: 'auto' }} />
                          💳 카드 결제 (즉시 결제)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <input type="radio" name="pm" checked={paymentMethod === 'BANK_TRANSFER'} onChange={() => setPaymentMethod('BANK_TRANSFER')} style={{ width: 'auto' }} />
                          🏦 계좌이체 (직접 입금)
                        </label>
                      </div>
                    </div>
                    {myPointBalance > 0 && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 10 }}>
                        <input
                          type="checkbox"
                          checked={useMyPoints}
                          onChange={(e) => setUseMyPoints(e.target.checked)}
                          style={{ width: 'auto' }}
                        />
                        보유 포인트 {myPointBalance.toLocaleString()}P 사용하기
                      </label>
                    )}
                    <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
                      최종 결제 금액: {Math.max(0, discountedUnitPrice * qty - (useMyPoints ? Math.min(myPointBalance, discountedUnitPrice * qty) : 0)).toLocaleString()}원
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    <button className="btn btn-primary btn-block" type="submit" disabled={joining || remaining < 1}>
                      {remaining < 1 ? '품절' : joining ? '처리 중…' : paymentMethod === 'CARD' ? '카드로 결제하기' : '계좌이체로 참여하기'}
                    </button>
                  </form>
                )}

                {myOrder && (
                  <div className="card" style={{ marginTop: 12, background: 'var(--bg-input)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                      <span>내 주문: {myOrder.option.name} × {myOrder.quantity}개</span>
                      <span className={`status-pill status-${myOrder.paymentStatus}`}>{PAY_LABEL[myOrder.paymentStatus]}</span>
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      결제 금액: {myOrder.amount.toLocaleString()}원
                      {myOrder.pointsUsed > 0 && ` (포인트 ${myOrder.pointsUsed.toLocaleString()}P 사용)`}
                    </div>
                    {myOrder.shippingAddress && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 8 }}>
                        📦 배송지: {myOrder.shippingAddress}
                      </div>
                    )}
                    {myOrder.paymentStatus === 'PENDING' && myOrder.paymentMethod === 'BANK_TRANSFER' && (
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
                    {myOrder.paymentStatus === 'PENDING' && myOrder.paymentMethod === 'CARD' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => router.push(`/checkout/${myOrder.id}`)}>
                          💳 결제 이어서 하기
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelPendingCardOrder}>
                          참여 취소
                        </button>
                      </div>
                    )}
                    {myOrder.paymentStatus === 'PAID' && (
                      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>
                        입금자명 "{myOrder.depositorName}" — 판매자 확인을 기다리는 중이에요.
                      </p>
                    )}
                    {myOrder.trackingNumber && (
                      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>
                        🚚 {myOrder.trackingCompany} {myOrder.trackingNumber}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14.5 }}>주문 / 정산 현황</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a className="btn btn-ghost btn-sm" href={`/api/events/${id}/export`}>⬇️ 정산/참여자 CSV</a>
                  <button className="btn btn-ghost btn-sm" onClick={sendReminder} disabled={reminding}>
                    {reminding ? '전송 중…' : '📩 미입금 리마인드 보내기'}
                  </button>
                </div>
              </div>
              {remindMsg && <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>{remindMsg}</p>}

              {orders?.length > 0 && (
                <div style={{ display: 'flex', gap: 16, margin: '12px 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
                  <span>확정 매출: <strong style={{ color: 'var(--text)' }}>{orders.filter((o) => o.paymentStatus === 'CONFIRMED').reduce((s, o) => s + o.amount, 0).toLocaleString()}원</strong></span>
                  <span>입금 대기중: <strong style={{ color: 'var(--text)' }}>{orders.filter((o) => o.paymentStatus !== 'CONFIRMED').reduce((s, o) => s + o.amount, 0).toLocaleString()}원</strong></span>
                </div>
              )}

              {(!orders || orders.length === 0) && <div className="empty-state">아직 참여자가 없어요.</div>}
              {orders?.map((o) => (
                <div key={o.id} className="order-row" style={{ flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 200 }}>
                    {o.buyer.name} · {o.option.name} × {o.quantity}개 · {o.amount.toLocaleString()}원
                    {' · '}{o.paymentMethod === 'CARD' ? '💳 카드' : '🏦 계좌이체'}
                    {o.shippingAddress && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>📦 {o.shippingAddress}</div>
                    )}
                    {o.paymentStatus === 'CONFIRMED' && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <input
                          placeholder="택배사"
                          defaultValue={o.trackingCompany || ''}
                          onChange={(e) => setTracking(o.id, 'company', e.target.value)}
                          style={{ maxWidth: 90, fontSize: 11.5, padding: '4px 6px' }}
                        />
                        <input
                          placeholder="송장번호"
                          defaultValue={o.trackingNumber || ''}
                          onChange={(e) => setTracking(o.id, 'number', e.target.value)}
                          style={{ maxWidth: 130, fontSize: 11.5, padding: '4px 6px' }}
                        />
                        <button className="mini-btn" onClick={() => saveTracking(o.id)}>저장</button>
                      </div>
                    )}
                  </span>
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
                {m.imageUrl && (
                  <div style={{ marginTop: 4 }}>
                    <img src={m.imageUrl} alt="" style={{ maxWidth: 180, borderRadius: 8, border: '1px solid var(--border)' }} />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          {chatImage && (
            <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)' }}>
              {chatImage.uploading ? (
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>이미지 업로드 중…</span>
              ) : (
                <>
                  <img src={chatImage.url} alt="" style={{ height: 40, borderRadius: 6 }} />
                  <button type="button" className="mini-btn" onClick={() => setChatImage(null)}>✕ 제거</button>
                </>
              )}
            </div>
          )}
          <form className="chat-input" onSubmit={sendChat}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => chatFileInputRef.current?.click()}
              title="이미지 첨부"
            >
              📷
            </button>
            <input
              ref={chatFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleChatImage}
            />
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

      {showReport && (
        <div className="modal-backdrop" onClick={() => { setShowReport(false); setReportMsg(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🚨 이 공구 신고하기</h2>
            <form onSubmit={submitReport}>
              <div className="field">
                <label>신고 사유</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                  <option>상품 미배송/먹튀 의심</option>
                  <option>상품 설명과 실제 상품이 다름</option>
                  <option>과장/허위 광고</option>
                  <option>연락 두절</option>
                  <option>기타</option>
                </select>
              </div>
              <div className="field">
                <label>자세한 내용 (선택)</label>
                <textarea value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} rows={3} placeholder="상황을 자세히 적어주시면 확인에 도움이 돼요." />
              </div>
              {reportMsg && (
                <p style={{ fontSize: 12.5, color: reportMsg.includes('접수됐어요') ? 'var(--success)' : 'var(--danger)' }}>{reportMsg}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowReport(false); setReportMsg(''); }}>
                  닫기
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={reportSaving}>
                  {reportSaving ? '접수 중…' : '신고 접수'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
