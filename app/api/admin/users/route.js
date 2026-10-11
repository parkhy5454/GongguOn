import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { AI_EMAIL } from '@/lib/aiAssistant';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = 50;

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: { email: { not: AI_EMAIL }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, email: true, name: true, phone: true, createdAt: true,
        referralCode: true, referredById: true, pointBalance: true, deletedAt: true,
        _count: { select: { hostedEvents: true, orders: true } },
      },
    }),
    prisma.user.count({ where: { email: { not: AI_EMAIL }, deletedAt: null } }),
  ]);

  return NextResponse.json({ users, page, pageSize, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)) });
}
