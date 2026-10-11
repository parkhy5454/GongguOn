import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { applyFirstPurchaseRewardIfNeeded } from '@/lib/rewards';
import { notify } from '@/lib/notify';

export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { event: true } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.event.hostId !== user.id) {
    return NextResponse.json({ error: '공구 개설자만 입금을 확인할 수 있어요.' }, { status: 403 });
  }

  // 카드·가상계좌는 토스 결제 결과로만 확정돼요 (판매자가 임의로 확정할 수 없음)
  if (order.paymentMethod !== 'BANK_TRANSFER') {
    return NextResponse.json({ error: '카드·가상계좌 결제는 자동으로 확인돼요.' }, { status: 400 });
  }
  if (order.paymentStatus !== 'PAID') {
    return NextResponse.json({ error: '구매자가 입금완료를 표시한 주문만 확인할 수 있어요.' }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { paymentStatus: 'CONFIRMED' },
    include: { option: true, buyer: { select: { id: true, name: true } } },
  });

  await applyFirstPurchaseRewardIfNeeded(order.buyerId);

  const io = global.__io;
  if (io) io.to(`event:${order.eventId}`).emit('order-updated', updated);

  await notify(order.buyerId, {
    type: 'payment_confirmed',
    title: '입금이 확인됐어요',
    body: `"${order.event.title}" 주문의 입금이 확인됐습니다.`,
    url: `/events/${order.eventId}`,
  });

  return NextResponse.json({ order: updated });
}
