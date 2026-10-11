import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

// 내가 차단한 사용자 목록
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rows = await prisma.block.findMany({
    where: { blockerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { blocked: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ blocks: rows.map((r) => ({ userId: r.blocked.id, name: r.blocked.name, createdAt: r.createdAt })) });
}

// 사용자 차단: 그 사람의 공구 채팅 메시지와 공구가 내 화면에서 보이지 않아요
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { userId } = await req.json();
  if (!userId || typeof userId !== 'string') return NextResponse.json({ error: '차단할 사용자를 확인해주세요.' }, { status: 400 });
  if (userId === user.id) return NextResponse.json({ error: '본인은 차단할 수 없어요.' }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: '사용자를 찾을 수 없어요.' }, { status: 404 });
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: userId } },
    update: {},
    create: { blockerId: user.id, blockedId: userId },
  });
  return NextResponse.json({ ok: true });
}

// 차단 해제 (?userId=...)
export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId가 필요해요.' }, { status: 400 });
  await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId: userId } });
  return NextResponse.json({ ok: true });
}
