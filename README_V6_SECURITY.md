
# v6 - 보안 + 에스크로 + 판매자 등급 + 실시간 참여 (쿠팡 이기는 최종)

## 1. 에스크로 (구매확정)
- Order에 isConfirmed, shippedAt, shippingStatus 추가
- 구매자가 배송완료 후 "구매확정" 버튼 눌러야 정산 READY
- 7일 후 자동확정 크론: /api/cron/auto-confirm?secret=xxx (매일 1회)

## 2. 가격 조작 방지
- app/api/orders/validate-price.js
- 주문 생성 시 프론트에서 보낸 가격을 서버에서 재계산
- 100원 이상 차이나면 SecurityLog에 PRICE_TAMPER 기록 + 차단

## 3. 신고 3회 자동 블라인드
- POST /api/reports -> 3회 누적 시 status=BLINDED
- 관리자에게 알림

## 4. 판매자 등급제
- src/lib/sellerTier.js
- 신규: 정산 14일, 5개까지
- 일반: 정산 7일, 20개까지
- 우수(후기50+, 평점4.5+): 정산 3일, 무제한
- 공구 개설 시 canCreateProduct() 체크

## 5. 실시간 참여자
- LiveParticipants.jsx - Socket.io로 "김**님이 방금 참여했어요" 실시간 표시
- 프로그레스바 + 초록불 깜빡임으로 FOMO 유발

## 6. 관리자 강제 조치 + 보안 로그
- POST /api/admin/force { productId, action: 'BLIND'|'FORCE_CLOSE'|'FORCE_CANCEL', adminEmail }
- 모든 관리자 행동 SecurityLog에 기록

## 7. 채팅 도배 방지
- server.js.patch 참고하여 server.js에 rate limit 추가

## 적용
npx prisma migrate dev --name v6_security_escrow
npm install
git push -> Render 재배포

cron-job.org에 추가:
- /api/cron/auto-confirm?secret=xxx 매일 1회
