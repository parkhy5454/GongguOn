import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (event.status !== 'OPEN') {
    return NextResponse.json({ error: '지금은 참여할 수 없는 공구예요 (마감/취소됨).' }, { status: 400 });
  }
  if (new Date(event.deadline) < new Date()) {
    return NextResponse.json({ error: '마감 시간이 지났습니다.' }, { status: 400 });
  }
  if (event.hostId === user.id) {
    return NextResponse.json({ error: '본인이 개설한 공구에는 참여할 수 없어요.' }, { status: 400 });
  }

  const { optionId, quantity, usePoints } = await req.json();
  const qty = Number(quantity);
  if (!optionId || !qty || qty < 1) {
    return NextResponse.json({ error: '옵션과 수량을 확인해주세요.' }, { status: 400 });
  }

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const option = await tx.eventOption.findUnique({ where: { id: optionId } });
      if (!option || option.eventId !== params.id) {
        throw new Error('옵션을 찾을 수 없습니다.');
      }
      const remaining = option.stock - option.soldCount;
      if (remaining < qty) {
        throw new Error(`재고가 부족해요 (남은 수량: ${remaining}개).`);
      }

      const buyer = await tx.user.findUnique({ where: { id: user.id } });
      const rawAmount = option.price * qty;
      let pointsToUse = 0;
      if (usePoints) {
        pointsToUse = Math.min(buyer.pointBalance, rawAmount);
      }

      await tx.eventOption.update({
        where: { id: optionId },
        data: { soldCount: { increment: qty } },
      });

      if (pointsToUse > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { pointBalance: { decrement: pointsToUse } },
        });
      }

      return tx.order.create({
        data: {
          eventId: params.id,
          optionId,
          buyerId: user.id,
          quantity: qty,
          amount: rawAmount - pointsToUse,
          pointsUsed: pointsToUse,
        },
        include: { option: true },
      });
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || '참여에 실패했습니다.' }, { status: 400 });
  }

  const io = global.__io;
  if (io) io.to(`event:${params.id}`).emit('order-created', { eventId: params.id });

  return NextResponse.json({ order });
}
