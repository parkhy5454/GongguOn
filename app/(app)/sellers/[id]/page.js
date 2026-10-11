import { prisma } from '@/lib/prisma';
import SellerStorefrontPage from '@/components/SellerStorefrontClient';

export async function generateMetadata({ params: paramsPromise }) {
  const params = await paramsPromise;
  try {
    const seller = await prisma.user.findUnique({
      where: { id: params.id },
      select: { name: true },
    });
    if (!seller) return { title: '공구온' };

    const ratingAgg = await prisma.review.aggregate({
      where: { targetId: params.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const title = `${seller.name}님의 상점 | 공구온`;
    const description = ratingAgg._avg.rating
      ? `⭐ ${ratingAgg._avg.rating.toFixed(1)} (후기 ${ratingAgg._count.rating}건) · 공구온에서 ${seller.name}님이 연 공동구매를 확인해보세요.`
      : `공구온에서 ${seller.name}님이 연 공동구매를 확인해보세요.`;

    return {
      title,
      description,
      openGraph: { title, description, type: 'website' },
      twitter: { card: 'summary', title, description },
    };
  } catch {
    return { title: '공구온' };
  }
}

export default function Page() {
  return <SellerStorefrontPage />;
}
