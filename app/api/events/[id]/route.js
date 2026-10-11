import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { applicableDiscount } from '@/lib/pricing';

export async function GET(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, name: true, email: true } },
      options: true,
      discountTiers: { orderBy: { minParticipants: 'asc' } },
      reviews: {
        include: { reviewer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const isHost = event.hostId === user.id;

  const ratingAgg = await prisma.review.aggregate({
    where: { targetId: event.hostId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const myOrder = await prisma.order.findFirst({
    where: { eventId: params.id, buyerId: user.id },
    include: { option: true },
    orderBy: { createdAt: 'desc' },
  });

  let orders = [];
  if (isHost) {
    orders = await prisma.order.findMany({
      where: { eventId: params.id },
      include: { buyer: { select: { id: true, name: true, email: true } }, option: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 참여 인원(구매 주문 기준 고유 인원 수)은 동적 할인 계산을 위해 누구에게나 공개
  const allOrders = isHost ? orders : await prisma.order.findMany({ where: { eventId: params.id }, select: { buyerId: true } });
  const currentParticipants = new Set(allOrders.map((o) => o.buyerId)).size;
  const currentDiscount = applicableDiscount(event.discountTiers, currentParticipants);
  const nextTier = event.discountTiers.find((t) => t.minParticipants > currentParticipants) || null;

  const favorite = await prisma.favorite.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: params.id } },
  });

  return NextResponse.json({
    event,
    hostRating: { avg: ratingAgg._avg.rating, count: ratingAgg._count.rating },
    isHost,
    myOrder,
    orders,
    totalParticipants: isHost ? currentParticipants : undefined,
    currentParticipants,
    currentDiscount,
    nextTier,
    isFavorited: !!favorite,
  });
}

export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (event.hostId !== user.id) {
    return NextResponse.json({ error: '공구를 개설한 판매자만 수정할 수 있어요.' }, { status: 403 });
  }

  const orderCount = await prisma.order.count({ where: { eventId: params.id } });

  const body = await req.json();
  const data = {};

  // 참여자 유무와 무관하게 항상 수정 가능한 필드
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if (typeof body.description === 'string') data.description = body.description || null;
  if (Array.isArray(body.images)) data.images = body.images.filter(Boolean);
  if (typeof body.category === 'string') data.category = body.category;
  if (typeof body.aiAutoReply === 'boolean') data.aiAutoReply = body.aiAutoReply;

  // 참여자가 아직 없을 때만 수정 가능한 필드 (가격/재고/마감일이 바뀌면 기존 주문과 어긋날 수 있어서)
  if (orderCount === 0) {
    if (body.deadline) data.deadline = new Date(body.deadline);
    if (body.minQuantity) data.minQuantity = Number(body.minQuantity);
  } else if (body.deadline || body.minQuantity) {
    return NextResponse.json({ error: '참여자가 있는 공구는 마감일/최소수량을 변경할 수 없어요.' }, { status: 400 });
  }

  const updated = await prisma.event.update({ where: { id: params.id }, data, include: { options: true } });

  return NextResponse.json({ event: updated, canEditDeadline: orderCount === 0 });
}
