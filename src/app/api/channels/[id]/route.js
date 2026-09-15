import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const channel = await prisma.channel.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ channel });
}
