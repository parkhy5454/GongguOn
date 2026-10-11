import './globals.css';

export const metadata = {
  title: '공구온 GongguOn',
  description: '정산·재고·신뢰까지 한 번에 해결하는 공동구매 전용 플랫폼',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
