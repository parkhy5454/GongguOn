import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { LIMITS, tooLong } from '@/lib/limits';

export async function POST(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const myOrder = await prisma.order.findFirst({ where: { eventId: params.id, buyerId: user.id } });
  if (!myOrder) {
    return NextResponse.json({ error: '이 공구에 참여한 사람만 후기를 남길 수 있어요.' }, { status: 403 });
  }
  if (myOrder.paymentStatus !== 'CONFIRMED') {
    return NextResponse.json({ error: '입금 확인이 완료된 주문만 후기를 남길 수 있어요.' }, { status: 403 });
  }

  const { rating, comment, imageUrl } = await req.json();
  const r = Number(rating);
  if (!r || r < 1 || r > 5) {
    return NextResponse.json({ error: '별점은 1~5 사이로 입력해주세요.' }, { status: 400 });
  }
  if (tooLong(comment, LIMITS.reviewComment)) {
    return NextResponse.json({ error: `후기는 ${LIMITS.reviewComment}자 이내로 입력해주세요.` }, { status: 400 });
  }

  const review = await prisma.review.upsert({
    where: { eventId_reviewerId: { eventId: params.id, reviewerId: user.id } },
    update: { rating: r, comment: comment || null, imageUrl: imageUrl || null },
    create: {
      eventId: params.id,
      reviewerId: user.id,
      targetId: event.hostId,
      rating: r,
      comment: comment || null,
      imageUrl: imageUrl || null,
    },
    include: { reviewer: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ review });
}
