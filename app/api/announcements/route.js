import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const announcements = await prisma.announcement.findMany({
    where: { active: true }, orderBy: { createdAt: 'desc' }, take: 3,
    select: { id: true, title: true, body: true, createdAt: true },
  });
  return NextResponse.json({ announcements });
}
