const NOTIFICATION_TYPES = [
  { key: 'new_order', label: '내 공구에 새 참여자가 생겼을 때' },
  { key: 'payment_confirmed', label: '내 결제가 확인됐을 때' },
  { key: 'payment_reminder', label: '입금 리마인드' },
  { key: 'event_status', label: '참여한 공구의 상태/배송이 바뀔 때' },
  { key: 'tracking_added', label: '송장번호가 등록됐을 때' },
  { key: 'order_cancelled', label: '참여자가 참여를 취소했을 때' },
  { key: 'refunded', label: '환불 처리됐을 때' },
  { key: 'deadline_soon', label: '참여한 공구 마감이 임박할 때' },
  { key: 'new_event_from_followed_seller', label: '팔로우한 판매자가 새 공구를 열 때' },
  { key: 'settlement_paid', label: '정산금이 지급 처리됐을 때' },
];

module.exports = { NOTIFICATION_TYPES };
