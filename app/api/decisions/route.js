import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const decisions = await prisma.message.findMany({
    where: { isDecision: true },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true } },
      channel: { select: { id: true, name: true } },
    },
    take: 200,
  });

  return NextResponse.json({ decisions });
}
