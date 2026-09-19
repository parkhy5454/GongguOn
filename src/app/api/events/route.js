import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      host: { select: { id: true, name: true } },
      options: true,
    },
  });

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

  return NextResponse.json({ events: enriched });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, deadline, minQuantity, options, images } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
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
  }

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description || null,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      deadline: new Date(deadline),
      minQuantity: Number(minQuantity) || 1,
      hostId: user.id,
      options: {
        create: options.map((o) => ({
          name: o.name.trim(),
          price: Number(o.price),
          stock: Number(o.stock),
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json({ event });
}
