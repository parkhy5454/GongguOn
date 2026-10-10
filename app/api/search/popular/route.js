import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await prisma.searchLog.findMany({
    where: { createdAt: { gte: weekAgo } },
    select: { query: true },
  });

  const counts = {};
  for (const l of logs) {
    const key = l.query.trim();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }

  const popular = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([query]) => query);

  return NextResponse.json({ popular });
}
