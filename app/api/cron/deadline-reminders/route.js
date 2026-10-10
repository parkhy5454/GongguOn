
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET /api/cron/deadline-reminders?secret=CRON_SECRET
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') !== process.env.CRON_SECRET) return new Response('Unauthorized',{status:401});

  const now = new Date();
  const threeHoursLater = new Date(now.getTime() + 3*60*60*1000);

  const closingSoon = await prisma.product.findMany({
    where: {
      status: 'RECRUITING',
      deadline: { gte: now, lte: threeHoursLater },
      deadlineNotified: false
    },
    include: { orders: { select: { userId: true } } }
  });

  for (const product of closingSoon) {
    const userIds = [...new Set(product.orders.map(o => o.userId))];
    
    // 푸시 발송 API 호출
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://' + req.headers.get('host')}/api/push/send?secret=${process.env.CRON_SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DEADLINE_3H',
        productId: product.id,
        userIds,
        title: `마감 3시간 전! ${product.title}`,
        body: `지금 ${product.orders.length}명 참여중, 마감되면 가격 인상돼요`,
        link: `/p/${product.id}`
      })
    }).catch(()=>{});

    await prisma.product.update({ where: { id: product.id }, data: { deadlineNotified: true } });
  }

  return Response.json({ success:true, count: closingSoon.length });
}
