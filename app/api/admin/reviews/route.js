import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' }, take: 100,
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
      target: { select: { id: true, name: true } },
      event: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ reviews });
}
