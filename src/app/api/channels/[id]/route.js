import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const channel = await prisma.channel.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (channel.isPrivate) {
    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: user.id, channelId: channel.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: '비공개 채널입니다. 초대받은 사람만 볼 수 있어요.' }, { status: 403 });
    }
  }

  return NextResponse.json({ channel });
}
