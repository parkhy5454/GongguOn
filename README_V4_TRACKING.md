
# v4 - 판매자 송장 일괄 업로드

## 판매자 흐름 (이제 판매자가 쿠팡보다 편함)

1. 판매자: 내 공구 페이지 > 참여자 명단 CSV 다운로드
2. 판매자: CJ택배/한진 홈페이지에서 송장 뽑고 엑셀 받음 (또는 직접 포장 후 송장번호 엑셀 정리)
3. 판매자: 우리 앱 > "송장 일괄 등록" > CSV 업로드 > 1초만에 50건 처리
4. 구매자: 자동으로 "배송이 시작되었어요! CJ 1234..." 알림 받음 (인앱 알림 + 선택: 이메일)

쿠팡 판매자는 송장 1개씩 손으로 입력해야 함. 우리는 50개 한 번에.

## 적용
- app/api/seller/tracking-bulk/route.js 복사
- src/components/TrackingBulkUpload.jsx 복사
- 판매자 주문 관리 페이지 (예: app/seller/orders/page.jsx) 에서

import TrackingBulkUpload from '@/src/components/TrackingBulkUpload'
<TrackingBulkUpload orders={orders} />

## Prisma에 필요한 필드 (이미 있을 가능성 높음)
model Order {
  carrier String?
  trackingNumber String?
  shippingStatus String @default("PREPARING") // PREPARING, SHIPPING, DELIVERED
  shippedAt DateTime?
}
