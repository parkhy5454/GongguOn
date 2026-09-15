import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export default async function DashboardIndex() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let general = await prisma.channel.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!general) {
    general = await prisma.channel.create({
      data: { name: 'general', description: '전체 공지 및 자유 대화' },
    });
  }
  redirect(`/dashboard/channel/${general.id}`);
}
