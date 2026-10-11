import './globals.css';
import PwaRegister from '@/components/PwaRegister';

export const metadata = {
  title: '공구온 GongguOn',
  description: '정산·재고·신뢰까지 한 번에 해결하는 공동구매 전용 플랫폼',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: '공구온', statusBarStyle: 'default' },
};

export const viewport = { themeColor: '#d1622b' };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
