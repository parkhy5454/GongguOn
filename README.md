# 공구온 (GongguOn) — 공동구매 전용 플랫폼 MVP

카카오톡 오픈채팅 기반 공동구매의 고질적인 문제(수작업 정산, 재고 파악 불가, 판매자 신뢰 확인 불가)를
해결하기 위한 공동구매 전용 플랫폼 MVP입니다.

## 핵심 기능
- 이메일/비밀번호 로그인·회원가입 (누구나 구매자/판매자 겸용)
- **공구 개설**: 옵션별(색상/사이즈 등) 가격·수량 설정, 마감일, 최소 성사 수량, 사진 여러 장(폰카메라 촬영 지원)
- **사진으로 AI 자동 작성**: 상품 사진을 올리면 Gemini가 제목/설명을 자동으로 써줌
- **실시간 재고 관리**: 참여할 때마다 옵션별 재고가 즉시 차감, 품절 시 자동 마감
- **참여인원 연동 동적 할인**: "N명 이상 참여 시 M% 할인" 구간을 설정하면, 참여자가 늘수록 이후 참여자에게 자동으로 더 싼 가격 적용 (핀둬둬 스타일 바이럴)
- **정산**: 구매자가 입금자명과 함께 "입금완료" 표시 → 판매자가 "입금 확인" 버튼으로 확정
- **친구 초대 + 포인트 리워드**: 초대 링크로 가입한 친구가 첫 구매를 확정하거나 첫 공구를 열면, 추천인과 피추천인 모두에게 포인트 지급. 포인트는 다른 공구 참여 시 결제 금액에서 차감 가능
- **인앱 실시간 알림**: 신규 참여, 입금 확인, 배송/공구 상태 변경, 미입금 리마인드(판매자가 수동 발송)를 상단 🔔 알림으로 실시간 수신
- **공구별 실시간 채팅** (Socket.io) — 질문/공지를 카톡 없이 그 자리에서. 판매자가 "AI 자동응답"을 켜면 자주 묻는 질문에 AI가 대신 답변
- **판매자 신뢰도**: 완료된 공구에 한해 구매자가 별점·후기 작성 → 판매자 상점 페이지(`/sellers/[id]`)에 평점·이력 누적
- **판매자 운영 도구**: 정산/참여자 명단 CSV 다운로드(엑셀에서 바로 열림), 확정 매출·대기 금액 요약
- **신고 기능**: 문제가 있는 공구를 신고 접수 (DB에 기록, 관리자 대시보드는 다음 단계)
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
- **알림 채널**: 지금은 앱 접속 시 보이는 인앱 알림(🔔)만 있습니다. 이메일 발송은 Resend 같은 서비스의 API 키를 추가하면 비교적 쉽게 붙일 수 있고, 카카오 알림톡은 사업자 인증과 별도 계약(카카오 비즈메시지/NHN Cloud 등)이 필요해 다음 단계 기능입니다.
- **마감 임박 자동 알림**: 특정 시각에 자동으로 실행되는 알림(예: "마감 3시간 전")은 스케줄러(Render Cron Job 등 유료 기능)가 필요해서 이번 MVP에는 없습니다. 지금은 판매자가 "미입금 리마인드 보내기" 버튼을 눌러 수동으로 보낼 수 있습니다.
- **자동 마감**: 최소 수량 미달 시 자동 취소는 없고, 판매자가 수동으로 "공구 취소" 처리해야 합니다.
- **신고 처리**: 신고는 DB에 기록되지만, 이를 확인/처리하는 관리자 화면은 아직 없습니다.

## 다음 개발 후보
- PG 결제 연동 (토스페이먼츠 등)
- 마감 임박/미입금 알림 (이메일/푸시)
- 최소 수량 미달 시 자동 취소 스케줄러
- 판매자 정산 대시보드 (기간별 매출, 정산 내역 엑셀 다운로드)
- 상품 이미지 업로드
