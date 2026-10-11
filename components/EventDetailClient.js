'use client';


import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { compressImage } from '@/lib/imageCompress';
import ShareButton from '@/components/ShareButton';
import { BANKS } from '@/lib/banksList';

const STATUS_LABEL = { OPEN: '진행중', CLOSED: '마감', CANCELLED: '취소됨', COMPLETED: '완료' };
const STATUS_CLASS = { OPEN: 'badge-open', CLOSED: 'badge-closed', CANCELLED: 'badge-cancelled', COMPLETED: 'badge-completed' };
const DELIVERY_LABEL = { PREPARING: '상품 준비중', SHIPPING: '배송중', DONE: '배송 완료' };
const PAY_LABEL = { PENDING: '입금 대기', PAID: '입금 확인 요청', CONFIRMED: '결제 완료', REFUNDED: '환불됨' };
const METHOD_LABEL = { CARD: '💳 카드', BANK_TRANSFER: '🏦 계좌이체', VIRTUAL_ACCOUNT: '🏦 가상계좌' };

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

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponMsg, setCouponMsg] = useState('');
  const [refundBank, setRefundBank] = useState('');
  const [refundNumber, setRefundNumber] = useState('');
  const [refundHolder, setRefundHolder] = useState('');
  const [blockedIds, setBlockedIds] = useState([]);
  const blockedRef = useRef([]);
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef(null);
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
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImageUploading, setReviewImageUploading] = useState(false);
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
      const bRes = await fetch('/api/blocks');
      if (bRes.ok) {
        const ids = (await bRes.json()).blocks.map((b) => b.userId);
        blockedRef.current = ids;
        setBlockedIds(ids);
      }
    })();

    const reloadMessages = async () => {
      const res = await fetch(`/api/events/${id}/messages`);
      if (res.ok) setMessages((await res.json()).messages);
      fetch(`/api/events/${id}/read`, { method: 'POST' }).catch(() => {});
    };
    reloadMessages();

    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;
    // 연결될 때마다(서버가 잠들었다 깨어나 재연결된 경우 포함) 방에 다시 입장하고, 놓친 내용을 새로 불러옴
    let connectedBefore = false;
    socket.on('connect', () => {
      socket.emit('join-event', id);
      if (connectedBefore) {
        reloadMessages();
        loadEvent();
      }
      connectedBefore = true;
    });

    socket.on('new-message', (msg) => {
      if (msg?.author?.id && blockedRef.current.includes(msg.author.id)) return;
      setMessages((prev) => [...prev, msg]);
      fetch(`/api/events/${id}/read`, { method: 'POST' }).catch(() => {});
    });
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
      body: JSON.stringify({
        optionId: selectedOption, quantity: qty, usePoints: useMyPoints, shippingAddress, paymentMethod,
        couponCode: coupon?.code || undefined,
        refundAccount: paymentMethod === 'VIRTUAL_ACCOUNT' ? { bank: refundBank, accountNumber: refundNumber, holderName: refundHolder } : undefined,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setJoining(false);
      setError(d.error || '참여에 실패했습니다.');
      return;
    }
    if (paymentMethod === 'CARD' || paymentMethod === 'VIRTUAL_ACCOUNT') {
      // 토스 결제창으로 이동 (카드/가상계좌는 결제창을 거쳐야 함, 계좌이체는 바로 완료)
      router.push(`/checkout/${d.order.id}`);
      return;
    }
    setJoining(false);
    setUseMyPoints(false);
    setCoupon(null);
    setCouponInput('');
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

  async function refundOrder(orderId) {
    const reason = prompt('환불 사유를 입력해주세요 (선택)') || undefined;
    if (!confirm('정말 환불하시겠어요? 카드결제는 실제로 결제가 취소되고, 재고와 포인트가 복구됩니다.')) return;
    const res = await fetch(`/api/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const d = await res.json();
    if (res.ok) await loadEvent();
    else alert(d.error || '환불에 실패했습니다.');
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
    fd.append('file', await compressImage(file));
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

  async function handleReviewImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReviewImageUploading(true);
    const fd = new FormData();
    fd.append('file', await compressImage(file));
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) setReviewImage(data.url);
    setReviewImageUploading(false);
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewSaving(true);
    setReviewMsg('');
    const res = await fetch(`/api/events/${id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: reviewRating, comment: reviewComment, imageUrl: reviewImage }),
    });
    const d = await res.json();
    setReviewSaving(false);
    if (!res.ok) {
      setReviewMsg(d.error || '후기 등록에 실패했습니다.');
      return;
    }
    setReviewMsg('후기가 등록됐어요. 감사합니다!');
    setReviewImage(null);
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

  async function applyCoupon() {
    setCouponMsg('');
    if (!couponInput.trim()) return;
    const res = await fetch('/api/coupons/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponInput, amount: Math.max(1, discountedUnitPrice * qty) }),
    });
    const d = await res.json();
    if (res.ok) {
      setCoupon({ code: d.code, discount: d.discount });
      setCouponMsg(`쿠폰 적용: ${d.discount.toLocaleString()}원 할인`);
    } else {
      setCoupon(null);
      setCouponMsg(d.error || '쿠폰을 적용할 수 없어요.');
    }
  }

  async function buyerCancel() {
    if (!confirm('참여를 취소하시겠어요? 결제하셨다면 환불되고, 사용한 포인트·쿠폰이 돌아옵니다.')) return;
    const res = await fetch(`/api/orders/${data.myOrder.id}/cancel`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (res.ok) await loadEvent();
    else alert(d.error || '취소에 실패했어요.');
  }

  async function blockUser(userId, name) {
    if (!confirm(`${name}님을 차단할까요? 이 사람의 채팅 메시지가 보이지 않게 돼요. (내 정보에서 해제 가능)`)) return;
    const res = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const ids = [...blockedRef.current, userId];
      blockedRef.current = ids;
      setBlockedIds(ids);
      setMessages((prev) => prev.filter((m) => m.author.id !== userId));
    }
  }

  async function decodeCsvFile(file) {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('\uFFFD')) text = new TextDecoder('euc-kr').decode(buf);
    return text;
  }

  async function importTracking(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const csv = await decodeCsvFile(file);
      const res = await fetch(`/api/events/${id}/tracking-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const d = await res.json();
      if (res.ok) {
        const sk = d.skipped || [];
        setImportMsg(`송장 ${d.updated ?? 0}건 등록` + (sk.length ? `, ${sk.length}건 건너뜀 (${sk.slice(0, 3).map((x) => `${x.line}행: ${x.reason}`).join(' / ')})` : ''));
        await loadEvent();
      } else {
        setImportMsg(d.error || '등록에 실패했어요.');
      }
    } catch {
      setImportMsg('파일을 읽지 못했어요.');
    }
    setImporting(false);
    if (csvInputRef.current) csvInputRef.current.value = '';
  }

  async function toggleFavorite() {
    const res = await fetch(`/api/events/${id}/favorite`, { method: 'POST' });
    if (res.ok) await loadEvent();
  }

  if (loading) return <div className="empty-state">불러오는 중…</div>;
  if (!data) return <div className="empty-state">공구를 찾을 수 없어요.</div>;

  const { event, isHost, myOrder, orders, hostRating, totalParticipants, currentParticipants, currentDiscount, nextTier, isFavorited } = data;
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
            {event.host.sellerVerified && <span title="운영진이 확인한 판매자" style={{ marginLeft: 4, fontSize: 11.5, color: '#1a7f4b', fontWeight: 700 }}>✅ 인증 판매자</span>}
            {hostRating.avg ? ` · ⭐ ${hostRating.avg.toFixed(1)} (${hostRating.count}건)` : ' · 신규 판매자'}
            {' · 마감 '}{formatDT(event.deadline)}
            {' · '}{DELIVERY_LABEL[event.deliveryStatus]}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <ShareButton
              title={event.title}
              description={`${event.host.name} 공구 · ${event.options?.[0] ? event.options[0].price.toLocaleString() + '원~' : ''}`}
              imageUrl={event.images?.[0] ? (event.images[0].startsWith('http') ? event.images[0] : undefined) : undefined}
            />
            {isHost && (
              <Link href={`/events/new?copy=${id}`} className="btn btn-ghost btn-sm">📄 복사해서 다시 열기</Link>
            )}
          </div>
          {!isHost && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className={`btn btn-sm ${isFavorited ? 'btn-primary' : 'btn-ghost'}`} onClick={toggleFavorite}>
                {isFavorited ? '♥ 찜함' : '♡ 찜하기'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)}>🚨 신고하기</button>
            </div>
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
                        style={{ cursor: canJoin ? 'pointer' : 'default', opacity: rem <= 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        {o.imageUrl && (
                          <img src={o.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                        )}
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <input type="radio" name="pm" checked={paymentMethod === 'VIRTUAL_ACCOUNT'} onChange={() => setPaymentMethod('VIRTUAL_ACCOUNT')} style={{ width: 'auto' }} />
                          🧾 가상계좌 (자동 확인)
                        </label>
                      </div>
                    </div>
                    {paymentMethod === 'VIRTUAL_ACCOUNT' && (
                      <div className="field" style={{ marginBottom: 10, background: 'var(--bg-input)', padding: 10, borderRadius: 8 }}>
                        <label>환불 받을 계좌 <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>(가상계좌는 환불 시 필요해요. 암호화 저장되며 처리 후 삭제돼요)</span></label>
                        <select value={refundBank} onChange={(e) => setRefundBank(e.target.value)} required>
                          <option value="">은행 선택</option>
                          {BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                        <input style={{ marginTop: 6 }} placeholder="계좌번호 (숫자만)" inputMode="numeric" value={refundNumber} onChange={(e) => setRefundNumber(e.target.value)} required />
                        <input style={{ marginTop: 6 }} placeholder="예금주명" value={refundHolder} onChange={(e) => setRefundHolder(e.target.value)} required />
                      </div>
                    )}
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label>쿠폰 코드 (선택)</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCoupon(null); setCouponMsg(''); }} placeholder="쿠폰 코드" />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={applyCoupon}>적용</button>
                      </div>
                      {couponMsg && <p style={{ fontSize: 12, margin: '4px 0 0', color: coupon ? 'var(--success)' : 'var(--danger)' }}>{couponMsg}</p>}
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
                      최종 결제 금액: {(() => {
                        const base = discountedUnitPrice * qty - (coupon?.discount || 0);
                        return Math.max(0, base - (useMyPoints ? Math.min(myPointBalance, Math.max(0, base)) : 0)).toLocaleString();
                      })()}원
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    <button className="btn btn-primary btn-block" type="submit" disabled={joining || remaining < 1}>
                      {remaining < 1 ? '품절' : joining ? '처리 중…' : paymentMethod === 'CARD' ? '카드로 결제하기' : paymentMethod === 'VIRTUAL_ACCOUNT' ? '가상계좌 발급받기' : '계좌이체로 참여하기'}
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
                      {myOrder.couponDiscount > 0 && ` (쿠폰 ${myOrder.couponDiscount.toLocaleString()}원 할인)`}
                    </div>
                    {myOrder.paymentStatus === 'PENDING' && myOrder.paymentMethod === 'VIRTUAL_ACCOUNT' && myOrder.vaNumber && (
                      <div style={{ fontSize: 13, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8, lineHeight: 1.7 }}>
                        🏦 <b>{myOrder.vaBank} {myOrder.vaNumber}</b><br />
                        입금액 {myOrder.amount.toLocaleString()}원{myOrder.vaDue && <> · 기한 {formatDT(myOrder.vaDue)}</>}<br />
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>입금하면 자동으로 결제완료 처리돼요.</span>
                      </div>
                    )}
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
                    {myOrder.paymentStatus === 'PENDING' && (myOrder.paymentMethod === 'CARD' || (myOrder.paymentMethod === 'VIRTUAL_ACCOUNT' && !myOrder.vaNumber)) && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => router.push(`/checkout/${myOrder.id}`)}>
                          💳 결제 이어서 하기
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelPendingCardOrder}>
                          참여 취소
                        </button>
                      </div>
                    )}
                    {myOrder.paymentStatus === 'PENDING' && myOrder.paymentMethod === 'VIRTUAL_ACCOUNT' && myOrder.vaNumber && (
                      <button className="btn btn-ghost btn-sm" onClick={buyerCancel}>참여 취소</button>
                    )}
                    {myOrder.paymentStatus === 'CONFIRMED' && !myOrder.trackingNumber && event.status === 'OPEN' && !deadlinePassed && (myOrder.paymentMethod === 'CARD' || myOrder.paymentMethod === 'VIRTUAL_ACCOUNT') && (
                      <button className="btn btn-ghost btn-sm" onClick={buyerCancel}>참여 취소 (환불)</button>
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
                <Link href={`/events/${id}/edit`} className="btn btn-ghost btn-sm" style={{ marginBottom: 10, display: 'inline-block' }}>
                  ✏️ 공구 정보 수정
                </Link>
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
                  <button className="btn btn-ghost btn-sm" onClick={() => csvInputRef.current?.click()} disabled={importing}>
                    {importing ? '등록 중…' : '📤 송장 CSV 일괄등록'}
                  </button>
                  <input ref={csvInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={importTracking} />
                </div>
              </div>
              {importMsg && <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>{importMsg} <span>(CSV의 택배사·송장번호 열을 채워 올려주세요)</span></p>}
              {remindMsg && <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>{remindMsg}</p>}

              {orders?.length > 0 && (
                <div style={{ display: 'flex', gap: 16, margin: '12px 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
                  <span>확정 매출: <strong style={{ color: 'var(--text)' }}>{orders.filter((o) => o.paymentStatus === 'CONFIRMED').reduce((s, o) => s + o.amount + (o.couponDiscount || 0), 0).toLocaleString()}원</strong></span>
                  <span>입금 대기중: <strong style={{ color: 'var(--text)' }}>{orders.filter((o) => o.paymentStatus !== 'CONFIRMED').reduce((s, o) => s + o.amount, 0).toLocaleString()}원</strong></span>
                </div>
              )}

              {(!orders || orders.length === 0) && <div className="empty-state">아직 참여자가 없어요.</div>}
              {orders?.map((o) => (
                <div key={o.id} className="order-row" style={{ flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 200 }}>
                    {o.buyer.name} · {o.option.name} × {o.quantity}개 · {o.amount.toLocaleString()}원
                    {' · '}{METHOD_LABEL[o.paymentMethod] || o.paymentMethod}
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
                  {o.paymentStatus === 'CONFIRMED' && (
                    <button className="btn btn-danger-outline btn-sm" onClick={() => refundOrder(o.id)}>환불</button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    📷 사진 첨부
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReviewImage} />
                  </label>
                  {reviewImageUploading && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>업로드 중…</span>}
                  {reviewImage && (
                    <div style={{ position: 'relative' }}>
                      <img src={reviewImage} alt="" style={{ height: 44, borderRadius: 6 }} />
                      <button type="button" onClick={() => setReviewImage(null)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', fontSize: 10 }}>✕</button>
                    </div>
                  )}
                </div>
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
                  {r.imageUrl && (
                    <img src={r.imageUrl} alt="" style={{ marginTop: 6, maxWidth: 160, borderRadius: 8, border: '1px solid var(--border)' }} />
                  )}
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
                {m.author.id !== data.meId && m.author.id !== event.host.id && (
                  <button type="button" title="차단" onClick={() => blockUser(m.author.id, m.author.name)} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--text-dim)', marginRight: 4 }}>🚫</button>
                )}
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
