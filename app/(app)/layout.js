import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin';
import TopNav from '@/components/TopNav';
import BottomTabBar from '@/components/BottomTabBar';
import EmailVerifyBanner from '@/components/EmailVerifyBanner';

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const agg = await prisma.review.aggregate({
    where: { targetId: user.id },
    _avg: { rating: true },
  });

  return (
    <>
      <TopNav user={{ id: user.id, name: user.name, email: user.email, rating: agg._avg.rating, referralCode: user.referralCode, pointBalance: user.pointBalance, isAdmin: isAdminEmail(user.email) }} />
      {!user.emailVerifiedAt && <EmailVerifyBanner />}
      {!user.phone && (
        <div style={{
          background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 13,
          padding: '10px 20px', textAlign: 'center', fontWeight: 600,
        }}>
          📱 휴대폰 번호가 등록되어 있지 않아요. 배송/정산 안내를 놓치지 않으려면{' '}
          <Link href="/profile" style={{ textDecoration: 'underline' }}>내 정보 수정</Link>에서 등록해주세요.
        </div>
      )}
      <div className="page">{children}</div>
      <BottomTabBar />
    </>
  );
}
