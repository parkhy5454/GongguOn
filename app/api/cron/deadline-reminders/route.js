import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notify';

// 외부 무료 스케줄러(cron-job.org 등)가 주기적으로(예: 30분마다) 이 URL을 호출하도록 설정하세요.
// 예: https://your-app.onrender.com/api/cron/deadline-reminders?secret=CRON_SECRET값
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3시간 이내 마감

  const events = await prisma.event.findMany({
    where: {
      status: 'OPEN',
      deadlineReminderSent: false,
      deadline: { gte: now, lte: soon },
    },
    include: { orders: { select: { buyerId: true } } },
  });

  let notified = 0;
  for (const event of events) {
    const buyerIds = [...new Set(event.orders.map((o) => o.buyerId))];
    for (const buyerId of buyerIds) {
      await notify(buyerId, {
        type: 'deadline_soon',
        title: '마감이 얼마 안 남았어요',
        body: `"${event.title}" 공구가 곧 마감돼요.`,
        url: `/events/${event.id}`,
      });
      notified++;
    }
    await prisma.event.update({ where: { id: event.id }, data: { deadlineReminderSent: true } });
  }

  return NextResponse.json({ eventsProcessed: events.length, notificationsSent: notified });
}
