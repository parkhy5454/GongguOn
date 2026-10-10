
# v5 - 푸시 알림 (카톡처럼)

## 설치

1. npm install web-push
2. npx web-push generate-vapid-keys
   -> 나온 키 2개를 .env에 추가
   VAPID_PUBLIC_KEY=xxx
   VAPID_PRIVATE_KEY=yyy
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx (public 키를 두 곳에)
   NEXT_PUBLIC_BASE_URL=https://당신도메인

3. Prisma migrate
   npx prisma migrate dev --name add_push

4. public/sw.js 교체 (push 이벤트 핸들러 추가됨)

## 사용

- 상품 상세: <PushBell userId={session.user.id} />
- 마감 3시간 전 자동 푸시: cron-job.org에 /api/cron/deadline-reminders?secret=xxx 등록 (1시간마다)

- 역경매 달성 시 자동 푸시: /api/push/send 호출
  POST /api/push/send
  { type: 'TIER_ACHIEVED', productId: 'xxx', title: '30명 달성!', body: '19,800원 -> 17,800원!', link: '/p/xxx' }

이제 고객 핸드폰에 카톡처럼 뜹니다: "공구온: 30명 모였어요! 2,000원 더 싸졌어요"

## iOS 주의
iOS는 PWA 설치 후에만 푸시 허용됨. 그래서 PWAInstall 배너가 필수.
