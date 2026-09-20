import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { AI_EMAIL } from '@/lib/aiAssistant';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { email: { not: AI_EMAIL } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, phone: true, createdAt: true,
      referralCode: true, referredById: true, pointBalance: true,
      _count: { select: { hostedEvents: true, orders: true } },
    },
  });

  return NextResponse.json({ users });
}
