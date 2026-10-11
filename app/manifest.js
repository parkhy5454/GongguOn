// 홈 화면에 추가했을 때 앱처럼 보이게 하는 설정 (PWA)
export default function manifest() {
  return {
    name: '공구온 GongguOn',
    short_name: '공구온',
    description: '정산·재고·신뢰까지 한 번에 해결하는 공동구매 전용 플랫폼',
    start_url: '/events',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f6f3',
    theme_color: '#d1622b',
    lang: 'ko',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
