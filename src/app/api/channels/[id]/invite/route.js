import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const channel = await prisma.channel.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // 초대하려는 사람이 이 채널의 멤버인지 확인 (비공개 채널 보호)
  const myMembership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: user.id, channelId: params.id } },
  });
  if (channel.isPrivate && !myMembership) {
    return NextResponse.json({ error: '이 채널의 멤버만 초대할 수 있어요.' }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email || !email.trim()) {
    return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
  }

  const invitee = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!invitee) {
    return NextResponse.json({ error: '해당 이메일로 가입된 사용자가 없습니다. 먼저 회원가입이 필요해요.' }, { status: 404 });
  }

  const existing = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: invitee.id, channelId: params.id } },
  });
  if (existing) {
    return NextResponse.json({ error: '이미 채널에 참여 중인 사용자입니다.' }, { status: 400 });
  }

  await prisma.channelMember.create({ data: { userId: invitee.id, channelId: params.id } });

  return NextResponse.json({ ok: true, invitedEmail: invitee.email, invitedName: invitee.name });
}
