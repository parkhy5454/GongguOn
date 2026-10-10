export const metadata = {
  title: 'GongguOn - 공동구매',
  description: '공동구매 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{margin:0, fontFamily:'system-ui, -apple-system, sans-serif'}}>
        {children}
      </body>
    </html>
  );
}
