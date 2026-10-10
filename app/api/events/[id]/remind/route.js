import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { notify } from '@/lib/notify';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (event.hostId !== user.id) {
    return NextResponse.json({ error: '공구 개설자만 리마인드를 보낼 수 있어요.' }, { status: 403 });
  }

  const pending = await prisma.order.findMany({
    where: { eventId: params.id, paymentStatus: 'PENDING' },
    select: { buyerId: true },
  });

  for (const o of pending) {
    await notify(o.buyerId, {
      type: 'payment_reminder',
      title: '입금 확인이 필요해요',
      body: `"${event.title}" 참여 건의 입금을 아직 완료하지 않으셨어요.`,
      url: `/events/${params.id}`,
    });
  }

  return NextResponse.json({ sent: pending.length });
}
