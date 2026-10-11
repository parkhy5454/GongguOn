import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { name: true, email: true } },
      event: { select: { id: true, title: true, host: { select: { name: true, email: true } } } },
    },
  });

  return NextResponse.json({ reports });
}
