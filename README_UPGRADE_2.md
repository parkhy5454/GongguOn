
# GongguOn - 쿠팡 가격 경쟁력 업그레이드 팩 (v2)

기존 GongguOn에 3가지 핵심 기능을 추가했습니다. (물류 제외하고 가격으로 이기는 구조)

## 추가된 기능 3가지

### 1. 월요마켓 선주문 시스템 (Made to Order)
- 상품에 `isPreorder: true`, `preorderDeadline: 월요일 23:59`, `factoryLeadTime: 3일` 추가
- 마감 전까지 주문 모으기 -> 화요일 자동 공장 발주서 생성
- 보관료 0원 = 20% 할인 가능

### 2. 역경매 / 인원수별 가격 인하 (Anti-Coupang Pricing)
- 기존 dynamic discount를 강화: 10명/30명/50명 구간별 가격 자동 인하
- 초대 링크로 들어오면 초대한 사람도 추가 할인 (광고비 0원)
- 실시간 카운터 UI 컴포넌트 포함

### 3. 박스 없는 새상품 / 리퍼 코너 (Waste Inventory)
- `isRefurbished`, `refurbReason`, `originalPrice` 필드 추가
- "박스 찌그러짐" 사진 필수, 정직하게 보여줘야 더 팔림
- 검색에서 리퍼 필터 분리

## 설치 방법
1. 기존 GongguOn 프로젝트에 이 파일들 덮어쓰기
2. npx prisma generate && npx prisma migrate dev --name add_price_competition
3. Render 재배포

