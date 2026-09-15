import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const todos = await prisma.todo.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      channel: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ todos });
}
