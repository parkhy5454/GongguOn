# 공구온 (GongguOn) — 공동구매 전용 플랫폼 MVP

카카오톡 오픈채팅 기반 공동구매의 고질적인 문제(수작업 정산, 재고 파악 불가, 판매자 신뢰 확인 불가)를
해결하기 위한 공동구매 전용 플랫폼 MVP입니다.

## 핵심 기능
- 이메일/비밀번호 로그인·회원가입 (누구나 구매자/판매자 겸용)
- **공구 개설**: 옵션별(색상/사이즈 등) 가격·수량 설정, 마감일, 최소 성사 수량
- **실시간 재고 관리**: 참여할 때마다 옵션별 재고가 즉시 차감, 품절 시 자동 마감
- **정산**: 구매자가 입금자명과 함께 "입금완료" 표시 → 판매자가 "입금 확인" 버튼으로 확정
- **공구별 실시간 채팅** (Socket.io) — 질문/공지를 카톡 없이 그 자리에서
- **판매자 신뢰도**: 완료된 공구에 한해 구매자가 별점·후기 작성 → 판매자 프로필에 평점 누적
- **배송 상태 관리**: 준비중 → 배송중 → 배송완료

## 기술 스택
- Next.js 14 (App Router, 프론트+백엔드 한 프로젝트)
- Socket.io — 실시간 채팅/주문 업데이트
- Prisma + Neon (PostgreSQL)
- JWT + bcrypt 인증
- GitHub + Render 배포

---

## 1. 로컬 실행
```bash
npm install
cp .env.example .env   # DATABASE_URL / DIRECT_URL / JWT_SECRET 채우기
npx prisma generate
npx prisma db push
npm run dev
```

## 2. GitHub 업로드
```bash
git init
git add .
git commit -m "Initial commit: GongguOn MVP"
git branch -M main
git remote add origin https://github.com/[내계정]/gonggu-on.git
git push -u origin main
```
(코딩 없이 하시려면: GitHub에서 새 저장소 생성 → "uploading an existing file" → 이 폴더 전체를 드래그 앤 드롭 → Commit)

## 3. Neon (DB)
- neon.tech에서 새 프로젝트 생성 → Connection string에서 Pooled(=DATABASE_URL)와 Direct(=DIRECT_URL) 두 개를 복사

## 4. Render 배포
- New Web Service → GitHub 저장소 연결
- Build Command: `npm install && npx prisma generate && npx prisma db push && npm run build`
- Start Command: `npm start`
- Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`

---

## 알려진 제한사항 (MVP 기준)
- **결제**: 실제 PG(카드결제) 연동 없이, "계좌 입금 + 입금자명 대조 + 판매자 수동 확인" 방식입니다. 실서비스 전환 시 토스페이먼츠/PG사 연동을 권장합니다.
- **알림**: 입금 리마인드, 마감 임박 알림 등은 아직 없습니다 (앱 내 실시간 반영만 지원).
- **자동 마감**: 최소 수량 미달 시 자동 취소는 없고, 판매자가 수동으로 "공구 취소" 처리해야 합니다.
- **정산 리포트**: 판매자별 매출 통계/엑셀 다운로드는 다음 단계 기능입니다.

## 다음 개발 후보
- PG 결제 연동 (토스페이먼츠 등)
- 마감 임박/미입금 알림 (이메일/푸시)
- 최소 수량 미달 시 자동 취소 스케줄러
- 판매자 정산 대시보드 (기간별 매출, 정산 내역 엑셀 다운로드)
- 상품 이미지 업로드
