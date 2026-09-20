import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 참여했거나(주문) 개설한 공구의 이벤트를 전부 모음 (= 채팅방 목록)
  const [myOrders, hostedEvents, myReads] = await Promise.all([
    prisma.order.findMany({ where: { buyerId: user.id }, select: { eventId: true }, distinct: ['eventId'] }),
    prisma.event.findMany({ where: { hostId: user.id }, select: { id: true } }),
    prisma.chatRead.findMany({ where: { userId: user.id } }),
  ]);

  const eventIds = [...new Set([...myOrders.map((o) => o.eventId), ...hostedEvents.map((e) => e.id)])];
  if (eventIds.length === 0) return NextResponse.json({ chats: [] });

  const readMap = Object.fromEntries(myReads.map((r) => [r.eventId, r.lastReadAt]));

  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    select: {
      id: true, title: true, images: true, status: true, hostId: true,
      host: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { author: { select: { name: true } } } },
    },
  });

  const unreadCounts = await Promise.all(
    events.map((e) =>
      prisma.eventMessage.count({
        where: { eventId: e.id, createdAt: { gt: readMap[e.id] || new Date(0) } },
      })
    )
  );

  const chats = events
    .map((e, i) => ({
      eventId: e.id,
      title: e.title,
      image: e.images?.[0] || null,
      status: e.status,
      isHost: e.hostId === user.id,
      lastMessage: e.messages[0]
        ? { author: e.messages[0].author.name, content: e.messages[0].imageUrl ? '📷 사진' : e.messages[0].content, createdAt: e.messages[0].createdAt }
        : null,
      unreadCount: unreadCounts[i],
    }))
    .sort((a, b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });

  return NextResponse.json({ chats });
}
