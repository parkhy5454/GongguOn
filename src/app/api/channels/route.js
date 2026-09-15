import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const channels = await prisma.channel.findMany({
    where: {
      OR: [
        { isPrivate: false },
        { members: { some: { userId: user.id } } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { messages: true, members: true } } },
  });
  return NextResponse.json({ channels });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { name, description, isPrivate } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: '채널 이름을 입력해주세요.' }, { status: 400 });
  }

  const channel = await prisma.channel.create({
    data: {
      name: name.trim(),
      description: description || null,
      isPrivate: !!isPrivate,
      members: { create: { userId: user.id } },
    },
  });

  return NextResponse.json({ channel });
}
