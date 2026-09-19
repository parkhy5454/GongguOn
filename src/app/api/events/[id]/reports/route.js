import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { reason, detail } = await req.json();
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: '신고 사유를 선택해주세요.' }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const report = await prisma.report.create({
    data: { eventId: params.id, reporterId: user.id, reason: reason.trim(), detail: detail || null },
  });

  return NextResponse.json({ report });
}
