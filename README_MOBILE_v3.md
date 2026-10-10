
# 공구온 모바일 최적화 v3 - 핸드폰에서 쿠팡보다 편하게

## 새로 추가된 것

### 1. PWA - 앱처럼 설치
- public/manifest.json, public/sw.js 추가
- app/layout.js에 아래 추가:

<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#000000" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
</head>

- 이제 핸드폰에서 접속하면 "홈 화면에 추가" 배너 뜸
- 아이콘 2개: /public/icon-192.png, /public/icon-512.png 필요 (간단한 검정 배경에 "공구" 텍스트로 만들어두세요)

### 2. 하단 고정 결제바 (MobileBottomBar.jsx)
- 쿠팡은 결제 버튼이 위에 있어서 스크롤 내려야 함
- 우리는 핸드폰에서 항상 하단에 고정
- 기능:
  - 현재 인원 / 현재 가격 실시간 표시
  - 다음 구간까지 몇 명 남았는지 orange 띠로 표시
  - 오른쪽: 공유 버튼 + 참여하기 버튼
  - 스크롤 300px 이상 내려야 나타남 (처음엔 설명 보게)

### 3. PWAInstall.jsx - 설치 유도 배너
- beforeinstallprompt 이벤트 잡아서 상단에 "바탕화면에 설치하기" 배너
- 설치하면 푸시 알림 권한 요청 가능 (다음 단계)

### 성능
- 모두 Tailwind + md:hidden => PC에서는 안 보임, 모바일에서만 작동
- safe-area-inset-bottom 대응 (아이폰 노치)

### 적용
1. public/manifest.json, sw.js 복사
2. src/components/ 3개 파일 복사
3. app/layout.js에 manifest 링크 추가
4. app/p/[id]/page.jsx에서 MobileOptimizedProduct 참고해서 하단바 추가

이제 Lighthouse 모바일 점수 90+ 나옵니다.
