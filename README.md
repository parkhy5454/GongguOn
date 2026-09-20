# 공구온 (GongguOn) — 공동구매 전용 플랫폼 MVP

카카오톡 오픈채팅 기반 공동구매의 고질적인 문제(수작업 정산, 재고 파악 불가, 판매자 신뢰 확인 불가)를
해결하기 위한 공동구매 전용 플랫폼 MVP입니다.

## 핵심 기능
- 이메일/비밀번호 로그인·회원가입 (누구나 구매자/판매자 겸용), 이용약관·개인정보처리방침 동의
- **공구 개설**: 옵션별(색상/사이즈 등) 가격·수량 설정, 마감일, 최소 성사 수량, 사진 여러 장(폰카메라 촬영 지원, Cloudinary에 안전하게 저장)
- **사진으로 AI 자동 작성**: 상품 사진을 올리면 Gemini가 제목/설명을 자동으로 써줌
- **검색/정렬/카테고리**: 공구 검색, 최신순·마감임박순·인기순 정렬, 12종 카테고리(식품/생활용품/패션 등) 필터
- **문의하기**: 상단바에서 버그신고/기능제안/기타 문의를 누구나 남길 수 있고, 관리자 페이지에서 확인
- **모바일 최적화**: 하단 탭바(공동구매/공구등록/내활동/내정보) 등 스마트폰 화면에 맞춘 레이아웃
- **실시간 재고 관리**: 참여할 때마다 옵션별 재고가 즉시 차감, 품절 시 자동 마감
- **참여인원 연동 동적 할인**: "N명 이상 참여 시 M% 할인" 구간을 설정하면, 참여자가 늘수록 이후 참여자에게 자동으로 더 싼 가격 적용 (핀둬둬 스타일 바이럴)
- **결제**: **카드 결제(토스페이먼츠)** 또는 **계좌이체** 중 선택. 카드 결제는 결제창에서 즉시 자동 확정되고, 계좌이체는 구매자가 입금자명과 함께 "입금완료" 표시 → 판매자가 "입금 확인"으로 확정
- **배송지 입력 + 송장번호**: 참여 시 배송지 주소 입력(기본 배송지 저장 가능), 판매자가 결제 확정 건에 택배사/송장번호 등록 → 구매자 화면에 실시간 표시
- **친구 초대 + 포인트 리워드**: 초대 링크로 가입한 친구가 첫 구매를 확정하거나 첫 공구를 열면, 추천인과 피추천인 모두에게 포인트 지급. 포인트는 다른 공구 참여 시 결제 금액에서 차감 가능
- **인앱 실시간 알림**: 신규 참여, 결제/입금 확인, 배송/공구 상태 변경, 송장 등록, 미입금 리마인드(수동), 마감임박(자동, 외부 스케줄러 연동 시)을 상단 🔔 알림으로 실시간 수신
- **공구별 실시간 채팅** (Socket.io, 이미지 첨부 가능) — 질문/공지를 카톡 없이 그 자리에서. 판매자가 "AI 자동응답"을 켜면 자주 묻는 질문에 AI가 대신 답변
- **판매자 신뢰도**: 완료된 공구에 한해 구매자가 별점·후기 작성 → 판매자 상점 페이지(`/sellers/[id]`)에 평점·이력 누적
- **판매자 운영 도구**: 정산/참여자 명단 CSV 다운로드(엑셀에서 바로 열림), 확정 매출·대기 금액 요약
- **신고 기능**: 문제가 있는 공구를 신고 접수 → 관리자 페이지에서 확인 가능
- **관리자 페이지** (`/admin`, 지정 이메일만 접근): 전체 회원/공구 현황/신고 내역 확인
- **비밀번호 찾기/재설정**, **내 정보 수정**(이름/휴대폰/기본배송지/비밀번호 변경)
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
- Build Command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- Start Command: `npm start`
- Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`, **`CLOUDINARY_CLOUD_NAME`**, **`CLOUDINARY_API_KEY`**, **`CLOUDINARY_API_SECRET`**, **`NEXT_PUBLIC_TOSS_CLIENT_KEY`**, **`TOSS_SECRET_KEY`**, (선택) `GEMINI_API_KEY`, (선택) `RESEND_API_KEY`, `RESEND_FROM`, (선택) `CRON_SECRET`

> ⚠️ `NEXT_PUBLIC_TOSS_CLIENT_KEY`는 브라우저에 노출되는 값이라 **빌드가 실행되기 전에** Render 환경변수에 반드시 먼저 등록되어 있어야 코드에 반영됩니다. 나중에 값만 바꾸고 재배포 없이 두면 적용되지 않으니, 값을 바꾼 뒤에는 꼭 재배포해주세요.

> ⚠️ **데이터 보존 방식으로 전환**: 이전에는 `prisma db push --force-reset`을 안내드렸는데, 이 명령은 스키마가 바뀔 때마다 기존 데이터를 전부 삭제합니다. 이제부터는 `prisma migrate deploy`를 사용합니다 — 이 명령은 **기존 데이터를 그대로 둔 채** 변경된 부분만 반영합니다. 앞으로 새 기능을 추가해도 회원/공구 데이터가 사라지지 않습니다.

### 최초 1회만: 기존 데이터베이스와 마이그레이션 이력 맞추기
지금 Neon 데이터베이스는 이미 최신 스키마 상태입니다(직전 배포에서 `--force-reset`으로 만들어짐). 그래서 이 프로젝트에 새로 생긴 "마이그레이션 이력"과 실제 DB 상태를 한 번 맞춰줘야, 이후 `migrate deploy`가 "테이블이 이미 있어요" 오류 없이 정상 작동합니다.

1. 이번 zip으로 GitHub 덮어쓰기 + Render 환경변수의 Build Command를 위 내용으로 수정
2. 재배포가 시작되면 (첫 배포는 "테이블이 이미 존재합니다" 류의 오류로 실패할 수 있어요 — 예상된 상황입니다)
3. Render 대시보드 → 서비스 → **Shell** 탭 열기
4. 아래 명령어 실행:
   ```
   npx prisma migrate resolve --applied 20260101000000_init
   ```
5. 좌측 상단 **Manual Deploy → Deploy latest commit**으로 재배포
6. 이번엔 정상적으로 "Live"가 됩니다

이 작업은 **딱 한 번만** 하시면 되고, 이후로는 스키마가 바뀌어도 그냥 GitHub에 덮어쓰기만 하면 데이터 손실 없이 자동으로 반영됩니다.

---

## 5. 토스페이먼츠(카드 결제) 설정
1. https://developers.tosspayments.com 가입 (사업자 등록 없이 테스트 키로 바로 개발 가능)
2. 개발자센터 → API 키 메뉴에서 **테스트 클라이언트 키**(`test_ck_...`)와 **테스트 시크릿 키**(`test_sk_...`)를 복사
3. Render 환경변수에 각각 `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`로 등록
4. 실제 서비스로 전환할 때는 토스페이먼츠에 사업자 심사를 받아 **라이브 키**로 교체하면 됩니다 (코드 변경 불필요, 키만 교체)
5. 테스트 키 상태에서는 실제 카드가 결제되지 않고, 토스가 제공하는 테스트 카드번호로만 결제 흐름을 확인할 수 있습니다.

## 6. Cloudinary(이미지 저장소) 설정
1. https://cloudinary.com 무료 가입
2. Dashboard 첫 화면에서 **Cloud name**, **API Key**, **API Secret**을 확인
3. Render 환경변수에 `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`으로 등록
4. 이제 상품 사진과 채팅 이미지가 Render 서버가 아닌 Cloudinary에 저장되어, **재배포해도 사진이 사라지지 않습니다.**

## 7. 마감임박 자동 알림(선택) 설정
1. Render 환경변수에 `CRON_SECRET`을 임의의 랜덤 문자열로 등록
2. https://cron-job.org 같은 무료 스케줄러 서비스에 가입
3. 30분~1시간 간격으로 아래 URL을 호출하도록 설정:
   ```
   https://[내 앱 주소]/api/cron/deadline-reminders?secret=[CRON_SECRET에 넣은 값]
   ```
4. 이제 마감 3시간 이내로 접어든 진행중 공구의 참여자들에게 자동으로 알림이 발송됩니다 (공구당 1회만 발송)

---

## 알려진 제한사항 (MVP 기준)
- **카드 결제 환불**: 결제 취소/환불 API는 아직 연결되어 있지 않습니다. 환불이 필요하면 토스페이먼츠 대시보드에서 수동으로 처리해야 합니다.
- **알림 채널**: 인앱 알림(🔔)은 실시간으로 오지만, 이메일은 Resend 키가 있을 때만, 카카오 알림톡은 사업자 인증과 별도 계약(카카오 비즈메시지/NHN Cloud 등)이 필요해 아직 없습니다.
- **자동 마감**: 최소 수량 미달 시 자동 취소는 없고, 판매자가 수동으로 "공구 취소" 처리해야 합니다.
- **신고 처리 워크플로**: 관리자 페이지에서 신고 내역을 "확인"은 할 수 있지만, 처리 상태 변경이나 제재 기능은 아직 없습니다.
- **채팅 이미지 용량**: 8MB 제한이며 별도 압축은 하지 않습니다.

## 다음 개발 후보
- PG 결제 연동 (토스페이먼츠 등)
- 마감 임박/미입금 알림 (이메일/푸시)
- 최소 수량 미달 시 자동 취소 스케줄러
- 판매자 정산 대시보드 (기간별 매출, 정산 내역 엑셀 다운로드)
- 상품 이미지 업로드
