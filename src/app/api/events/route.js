import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { EVENT_REFERRER_BONUS, EVENT_REFEREE_BONUS } from '@/lib/referral';
import { notify } from '@/lib/notify';
import { LIMITS, tooLong } from '@/lib/limits';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const sort = searchParams.get('sort') || 'new';
  const category = searchParams.get('category');

  if (q) {
    prisma.searchLog.create({ data: { query: q } }).catch(() => {});
  }

  const orderBy =
    sort === 'deadline' ? { deadline: 'asc' } :
    sort === 'popular' ? { orders: { _count: 'desc' } } :
    { createdAt: 'desc' };

  const where = {};
  if (q) where.title = { contains: q, mode: 'insensitive' };
  if (category && category !== 'ALL') where.category = category;

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = 24;

  const [events, totalCount] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        host: { select: { id: true, name: true } },
        options: true,
        discountTiers: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  // 호스트별 평점 맵 계산
  const hostIds = [...new Set(events.map((e) => e.hostId))];
  const ratings = await prisma.review.groupBy({
    by: ['targetId'],
    where: { targetId: { in: hostIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap = Object.fromEntries(ratings.map((r) => [r.targetId, { avg: r._avg.rating, count: r._count.rating }]));

  const enriched = events.map((e) => ({
    ...e,
    hostRating: ratingMap[e.hostId] || null,
  }));

  return NextResponse.json({
    events: enriched,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, deadline, minQuantity, options, images, discountTiers, aiAutoReply, category } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
  }
  if (tooLong(title, LIMITS.eventTitle)) {
    return NextResponse.json({ error: `제목은 ${LIMITS.eventTitle}자 이내로 입력해주세요.` }, { status: 400 });
  }
  if (tooLong(description, LIMITS.eventDescription)) {
    return NextResponse.json({ error: `설명은 ${LIMITS.eventDescription}자 이내로 입력해주세요.` }, { status: 400 });
  }
  if (!deadline) {
    return NextResponse.json({ error: '마감일을 선택해주세요.' }, { status: 400 });
  }
  if (!Array.isArray(options) || options.length === 0) {
    return NextResponse.json({ error: '옵션(가격/수량)을 최소 1개 입력해주세요.' }, { status: 400 });
  }
  for (const o of options) {
    if (!o.name || !o.price || !o.stock) {
      return NextResponse.json({ error: '옵션의 이름, 가격, 수량을 모두 입력해주세요.' }, { status: 400 });
    }
    if (tooLong(o.name, LIMITS.optionName)) {
      return NextResponse.json({ error: `옵션 이름은 ${LIMITS.optionName}자 이내로 입력해주세요.` }, { status: 400 });
    }
  }

  const validTiers = Array.isArray(discountTiers)
    ? discountTiers
        .filter((t) => Number(t.minParticipants) > 0 && Number(t.discountPercent) > 0)
        .map((t) => ({ minParticipants: Number(t.minParticipants), discountPercent: Math.min(90, Number(t.discountPercent)) }))
    : [];

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description || null,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      category: category || '기타',
      deadline: new Date(deadline),
      minQuantity: Number(minQuantity) || 1,
      aiAutoReply: !!aiAutoReply,
      hostId: user.id,
      options: {
        create: options.map((o) => ({
          name: o.name.trim(),
          price: Number(o.price),
          stock: Number(o.stock),
          imageUrl: o.imageUrl || null,
        })),
      },
      discountTiers: { create: validTiers },
    },
    include: { options: true, discountTiers: true },
  });

  // 추천 리워드: 추천받은 사람의 "첫 공구 개설"이면 추천인+피추천인 모두에게 포인트 지급
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (fresh?.referredById && !fresh.firstEventRewardGiven) {
    const eventCount = await prisma.event.count({ where: { hostId: user.id } });
    if (eventCount === 1) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: fresh.referredById },
          data: { pointBalance: { increment: EVENT_REFERRER_BONUS } },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { pointBalance: { increment: EVENT_REFEREE_BONUS }, firstEventRewardGiven: true },
        }),
      ]);
    }
  }

  const followers = await prisma.follow.findMany({ where: { sellerId: user.id }, select: { followerId: true } });
  for (const f of followers) {
    await notify(f.followerId, {
      type: 'new_event_from_followed_seller',
      title: '팔로우한 판매자가 새 공구를 열었어요',
      body: `${user.name}님이 "${event.title}"를 열었어요.`,
      url: `/events/${event.id}`,
    });
  }

  return NextResponse.json({ event });
}
