import './globals.css';

export const metadata = {
  title: 'WorkTalk',
  description: '카톡보다 체계적인 팀 업무 메신저',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
