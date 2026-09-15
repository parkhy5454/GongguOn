# WorkTalk — 팀 업무 협업 메신저 (MVP)

카카오톡으로 업무 소통을 하다가 겪는 문제(정보 유실, 파일 관리 부재, 할 일 추적 불가, 결정사항 불명확)를
해결하기 위한 업무 특화 메신저 MVP입니다.

## 핵심 기능
- 이메일/비밀번호 로그인·회원가입 (JWT 쿠키 인증)
- 채널 기반 대화 + **실시간 메시지** (Socket.io)
- **파일 첨부** (최대 10MB)
- 메시지를 **"결정으로 표시"** → 별도 결정 로그 페이지에서 모아보기
- 메시지를 **"할 일로 전환"** → 담당자/기한과 함께 할 일 보드에서 상태 관리 (할 일 → 진행 중 → 완료)
- 채널 생성/참여

## 기술 스택
- **Next.js 14** (App Router, 프론트+백엔드 한 프로젝트)
- **Socket.io** — 실시간 채팅 (커스텀 Node 서버 `server.js`로 구동, Render의 상시 실행 서버에 적합)
- **Prisma + Neon (PostgreSQL)** — 데이터베이스
- **JWT + bcrypt** — 인증
- **GitHub** — 코드 저장소
- **Render** — 배포

---

## 1. 로컬에서 실행하기

### 1-1. 필요 조건
- Node.js 18.18 이상
- Neon 계정 (무료): https://neon.tech

### 1-2. 설치
```bash
npm install
```

### 1-3. 환경변수 설정
`.env.example`을 복사해서 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

Neon 대시보드에서 프로젝트를 만들면 두 개의 연결 문자열을 줍니다:
- **Pooled connection** → `.env`의 `DATABASE_URL`
- **Direct connection** → `.env`의 `DIRECT_URL` (Prisma 마이그레이션용)

`JWT_SECRET`은 아무 랜덤 문자열(32자 이상 권장)로 채워주세요.

### 1-4. DB 스키마 반영
```bash
npx prisma generate
npx prisma db push
```

### 1-5. 개발 서버 실행
```bash
npm run dev
```
http://localhost:3000 에서 확인 가능합니다.

---

## 2. GitHub에 업로드하기

압축을 푼 폴더에서:

```bash
cd worktalk
git init
git add .
git commit -m "Initial commit: WorkTalk MVP"
git branch -M main
git remote add origin https://github.com/[내계정]/worktalk.git
git push -u origin main
```

> `.env` 파일은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.
> Render 배포 시에는 Render 대시보드에서 환경변수를 따로 등록합니다 (아래 3단계).

GitHub 저장소가 아직 없다면:
1. https://github.com/new 에서 저장소 생성 (Public/Private 무관)
2. 위 명령어의 `[내계정]` 부분을 본인 계정명/저장소명으로 수정 후 실행

---

## 3. Neon (데이터베이스) 설정

1. https://neon.tech 가입 후 New Project 생성
2. 프로젝트 생성 시 리전은 서비스 대상 사용자와 가까운 곳(예: Asia-Pacific) 선택
3. **Connection Details**에서:
   - `Pooled connection` 문자열 → 나중에 Render의 `DATABASE_URL`
   - `Direct connection` 문자열 → Render의 `DIRECT_URL`
4. 로컬에서 `npx prisma db push`로 최초 1회 스키마를 반영해두면 Render 배포 후 바로 사용 가능
   (또는 Render 최초 배포 후 Render Shell에서 실행해도 됩니다)

---

## 4. Render에 배포하기

1. https://render.com 가입 → **New +** → **Web Service**
2. GitHub 저장소(worktalk) 연결
3. 설정값:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free 또는 Starter (Socket.io 실시간 연결은 상시 실행 서비스에서 가장 안정적으로 동작합니다. Free 플랜은 일정 시간 미사용 시 슬립될 수 있습니다.)
4. **Environment Variables**에 아래 값 등록:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon Pooled connection 문자열 |
   | `DIRECT_URL` | Neon Direct connection 문자열 |
   | `JWT_SECRET` | 랜덤 문자열 (32자 이상) |
   | `NODE_ENV` | `production` |
5. **Create Web Service** 클릭 → 자동 빌드·배포 시작
6. 최초 배포 후 스키마가 아직 없다면 Render 대시보드의 **Shell** 탭에서:
   ```bash
   npx prisma db push
   ```

배포가 끝나면 Render가 제공하는 `https://[서비스명].onrender.com` 주소로 접속해 테스트합니다.

---

## 5. 알려진 제한사항 (MVP 기준)
- **파일 업로드**: 현재 서버 로컬 디스크(`public/uploads`)에 저장됩니다. Render 무료/기본 플랜은 재배포 시 디스크가 초기화되므로, 운영 단계에서는 Render의 **Persistent Disk** 추가 또는 S3/Cloudinary 같은 외부 스토리지 연동을 권장합니다.
- **알림**: 현재 인앱 실시간 알림만 있고, 푸시/이메일 알림은 없습니다.
- **권한 관리**: 모든 로그인 사용자가 모든 채널에 접근 가능한 단순 구조입니다. 조직/역할 기반 권한은 다음 단계 기능입니다.
- **동시 접속 규모**: 소규모 팀(수십 명) 기준 MVP이며, 대규모 트래픽 대응은 별도 설계가 필요합니다.

## 6. 다음 개발 후보
- 비공개 채널 / 멤버 초대
- AI 메시지 요약, 미확인 메시지 요약
- 외부 파일 스토리지 연동 (S3 등)
- 알림(이메일/푸시)
- 워크스페이스(조직) 단위 분리 및 관리자 대시보드

---

*이 프로젝트는 "카카오톡의 업무용 한계를 보완하는 팀 협업 메신저" 기획서를 기반으로 만든 MVP 구현체입니다.*
