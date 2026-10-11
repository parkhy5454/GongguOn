import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { confirmTossPayment } from '@/lib/toss';
import { finalizeOrderConfirmed, notifyHostPaid } from '@/lib/paymentReconcile';
import { notify } from '@/lib/notify';
import { bankName } from '@/lib/banks';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { orderId, paymentKey, amount } = await req.json();
  if (!orderId || !paymentKey || !amount) {
    return NextResponse.json({ error: '결제 정보가 올바르지 않아요.' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { event: true } });
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없어요.' }, { status: 404 });
  if (order.buyerId !== user.id) return NextResponse.json({ error: '본인 주문만 결제할 수 있어요.' }, { status: 403 });
  if (order.paymentStatus === 'CONFIRMED') {
    return NextResponse.json({ order }); // 이미 처리된 결제(중복 콜백 또는 웹훅이 먼저 처리)면 그대로 성공 응답
  }
  // 가상계좌는 계좌 발급 후 입금 대기 상태로 이 화면에 다시 올 수 있음 (새로고침 등) — 발급 정보를 그대로 보여줌
  if (order.paymentMethod === 'VIRTUAL_ACCOUNT' && order.vaNumber) {
    return NextResponse.json({ order: publicOrder(order), virtualAccount: vaInfo(order) });
  }
  if (Number(amount) !== order.amount) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않아요.' }, { status: 400 });
  }

  const { payment, error } = await confirmTossPayment({ paymentKey, orderId, amount: Number(amount) });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  // 가상계좌: 승인 시점에는 "입금 대기" 상태로 계좌번호만 발급됨 → 실제 입금은 웹훅이 확인
  if (payment.status === 'WAITING_FOR_DEPOSIT' && payment.virtualAccount) {
    const va = payment.virtualAccount;
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        tossPaymentKey: payment.paymentKey,
        vaBank: bankName(va.bankCode || va.bank),
        vaNumber: va.accountNumber,
        vaDue: va.dueDate ? new Date(va.dueDate) : null,
        vaSecret: payment.secret || null,
      },
    });
    await notify(user.id, {
      type: 'payment_confirmed',
      title: '입금 계좌가 발급됐어요',
      body: `${updated.vaBank} ${updated.vaNumber} · ${updated.amount.toLocaleString()}원을 입금기한 안에 입금해주세요.`,
      url: `/events/${order.eventId}`,
    });
    return NextResponse.json({ order: publicOrder(updated), virtualAccount: vaInfo(updated) });
  }

  const updated = await finalizeOrderConfirmed(orderId, { tossPaymentKey: payment.paymentKey });
  if (updated) await notifyHostPaid({ ...order, id: orderId }, user.name, '카드');

  return NextResponse.json({ order: publicOrder(updated || order) });
}

function vaInfo(o) {
  return { bank: o.vaBank, accountNumber: o.vaNumber, dueDate: o.vaDue, amount: o.amount };
}
function publicOrder(o) {
  const { vaSecret, refundAccountEnc, ...rest } = o;
  return rest;
}
