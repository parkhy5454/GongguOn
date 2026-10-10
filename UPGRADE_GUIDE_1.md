
# 적용 가이드 (5분)

### 1. Prisma 적용
기존 schema.prisma에 schema_upgrade.prisma.patch 내용 복사
```
npx prisma migrate dev --name add_price_competition
npx prisma generate
```

### 2. 파일 복사
- app/api/cron/factory-orders/route.js -> 기존 프로젝트 동일 경로에 복사
- src/components/ReverseAuctionCounter.jsx -> 상품 상세 페이지에 import
  예: app/p/[id]/page.jsx 에서
  ```
  import ReverseAuctionCounter from '@/src/components/ReverseAuctionCounter'
  <ReverseAuctionCounter product={product} currentCount={product._count.orders} />
  ```

- src/components/RefurbishedBadge.jsx -> 리퍼 상품일 때 표시

### 3. 상품 등록 시
- 선주문 체크박스 ON -> 마감일 월요일로 설정 -> 공장 이메일 입력
- 가격 구간: 10명 19800, 30명 17800, 50명 14800 식으로 설정
- 리퍼 상품은 isRefurbished ON + 하자 사진 3장 필수

### 4. cron-job.org 등록
https://cron-job.org 에서
- URL: https://당신도메인/api/cron/factory-orders?secret=당신의CRON_SECRET
- 스케줄: 매주 월요일 23:59 (Asia/Seoul)

이제 고객은 월요일마다 "이번주 공구 뭐 나오나" 보러 옵니다. 쿠팡이 절대 못하는 구조.

