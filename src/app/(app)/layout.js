import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin';
import TopNav from '@/components/TopNav';

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
      <div className="page">{children}</div>
    </>
  );
}
