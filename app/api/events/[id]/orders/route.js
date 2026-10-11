import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { applicableDiscount, priceWithDiscount } from '@/lib/pricing';
import { notify } from '@/lib/notify';
import { LIMITS, tooLong } from '@/lib/limits';
import { normalizeCode, calcCouponDiscount } from '@/lib/coupon';
import { validateRefundAccount, encryptAccount } from '@/lib/banks';

// 카드·가상계좌 같은 온라인 결제는 결제 금액이 최소 100원은 되어야 해요 (토스 결제 조건)
const MIN_ONLINE_AMOUNT = 100;

export async function POST(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { discountTiers: true } });
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

  const { optionId, quantity, usePoints, shippingAddress, paymentMethod, couponCode, refundAccount } = await req.json();
  const qty = Number(quantity);
  if (!optionId || !qty || qty < 1) {
    return NextResponse.json({ error: '옵션과 수량을 확인해주세요.' }, { status: 400 });
  }
  if (!shippingAddress || !shippingAddress.trim()) {
    return NextResponse.json({ error: '배송지 주소를 입력해주세요.' }, { status: 400 });
  }
  if (tooLong(shippingAddress, LIMITS.addressLine)) {
    return NextResponse.json({ error: `배송지는 ${LIMITS.addressLine}자 이내로 입력해주세요.` }, { status: 400 });
  }
  const method = paymentMethod === 'CARD' ? 'CARD' : paymentMethod === 'VIRTUAL_ACCOUNT' ? 'VIRTUAL_ACCOUNT' : 'BANK_TRANSFER';
  const isOnline = method !== 'BANK_TRANSFER';
  if (isOnline && !user.emailVerifiedAt) {
    return NextResponse.json(
      { error: '카드·가상계좌 결제는 이메일 인증 후 이용할 수 있어요. 상단 배너에서 인증 메일을 확인해주세요. (계좌이체는 바로 이용 가능해요)' },
      { status: 403 }
    );
  }

  // 가상계좌는 나중에 환불이 필요할 때를 대비해 환불 받을 계좌를 미리 받아 암호화해서 보관
  let refundAccountEnc = null;
  if (method === 'VIRTUAL_ACCOUNT') {
    const v = validateRefundAccount(refundAccount);
    if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
    refundAccountEnc = encryptAccount(v.account);
  }

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const option = await tx.eventOption.findUnique({ where: { id: optionId } });
      if (!option || option.eventId !== params.id) {
        throw new Error('옵션을 찾을 수 없습니다.');
      }

      // 동시 요청에서도 재고가 초과 판매되지 않도록, "그 시점의 재고가 충분할 때만" 원자적으로 증가시킴
      const updateResult = await tx.$executeRaw`
        UPDATE "EventOption"
        SET "soldCount" = "soldCount" + ${qty}
        WHERE "id" = ${optionId} AND "stock" >= "soldCount" + ${qty}
      `;
      if (updateResult === 0) {
        const fresh = await tx.eventOption.findUnique({ where: { id: optionId } });
        const remaining = fresh ? fresh.stock - fresh.soldCount : 0;
        throw new Error(`재고가 부족해요 (남은 수량: ${Math.max(0, remaining)}개).`);
      }

      // 참여 인원 연동 동적 할인: 지금 참여하면 몇 번째 참여자가 되는지로 계산
      const existingBuyers = await tx.order.findMany({ where: { eventId: params.id }, select: { buyerId: true } });
      const buyerSet = new Set(existingBuyers.map((o) => o.buyerId));
      buyerSet.add(user.id);
      const discountPercent = applicableDiscount(event.discountTiers, buyerSet.size);
      const unitPrice = priceWithDiscount(option.price, discountPercent);

      const buyer = await tx.user.findUnique({ where: { id: user.id } });
      const rawAmount = unitPrice * qty;
      const minPay = isOnline ? MIN_ONLINE_AMOUNT : 0;

      // 쿠폰 적용 (사용 가능 횟수는 DB에서 원자적으로 확인·증가)
      let couponDiscount = 0;
      let coupon = null;
      const code = normalizeCode(couponCode);
      if (code) {
        coupon = await tx.coupon.findUnique({ where: { code } });
        const calc = calcCouponDiscount(coupon, rawAmount);
        if (!calc.ok) throw new Error(calc.error);
        couponDiscount = Math.min(calc.discount, Math.max(0, rawAmount - minPay));
        if (couponDiscount <= 0) throw new Error('결제 금액이 너무 낮아서 쿠폰을 쓸 수 없어요.');
        const used = await tx.$executeRaw`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE "id" = ${coupon.id} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
        `;
        if (used === 0) throw new Error('쿠폰이 모두 소진됐어요.');
      }
      const afterCoupon = rawAmount - couponDiscount;

      let pointsToUse = 0;
      if (usePoints) {
        pointsToUse = Math.max(0, Math.min(buyer.pointBalance, afterCoupon - minPay));
      }

      if (pointsToUse > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { pointBalance: { decrement: pointsToUse } },
        });
      }

      const created = await tx.order.create({
        data: {
          eventId: params.id,
          optionId,
          buyerId: user.id,
          quantity: qty,
          amount: afterCoupon - pointsToUse,
          discountPercent,
          pointsUsed: pointsToUse,
          couponCode: coupon ? coupon.code : null,
          couponDiscount,
          shippingAddress: shippingAddress.trim(),
          paymentMethod: method,
          refundAccountEnc,
        },
        include: { option: true },
      });
      if (coupon) {
        await tx.couponRedemption.create({
          data: { couponId: coupon.id, userId: user.id, orderId: created.id, discount: couponDiscount },
        });
      }
      return created;
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: '이미 사용한 쿠폰이에요. (쿠폰은 1인 1회 사용할 수 있어요)' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || '참여에 실패했습니다.' }, { status: 400 });
  }

  const io = global.__io;
  if (io) io.to(`event:${params.id}`).emit('order-created', { eventId: params.id });

  // 계좌이체는 참여 즉시 알림, 카드결제는 실제 결제 확정 시점(/api/payments/confirm)에만 알림 (중복 방지)
  if (method === 'BANK_TRANSFER') {
    await notify(event.hostId, {
      type: 'new_order',
      title: '새로운 참여자가 있어요',
      body: `"${event.title}"에 ${user.name}님이 참여했어요.`,
      url: `/events/${params.id}`,
    });
  }

  const { refundAccountEnc: _r, vaSecret: _v, ...safeOrder } = order;
  return NextResponse.json({ order: safeOrder });
}
