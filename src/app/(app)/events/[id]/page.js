import { prisma } from '@/lib/prisma';
import EventDetailPage from '@/components/EventDetailClient';

export async function generateMetadata({ params }) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { title: true, description: true, images: true, category: true },
    });

    if (!event) {
      return { title: '공구온', description: '공동구매 전용 플랫폼' };
    }

    const title = `${event.title} | 공구온`;
    const description = event.description?.slice(0, 100) || `${event.category} 카테고리의 공동구매 · 공구온에서 참여해보세요.`;
    const image = event.images?.[0];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : undefined,
        type: 'website',
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: '공구온' };
  }
}

export default function Page() {
  return <EventDetailPage />;
}
