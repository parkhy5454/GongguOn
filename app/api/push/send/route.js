
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /api/push/send - 관리자/크론에서 호출
// body: { type: 'TIER_ACHIEVED' | 'DEADLINE_3H' | 'SHIPPING', productId, userIds? }

export async function POST(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  // CRON_SECRET or ADMIN check
  // if (secret !== process.env.CRON_SECRET) return new Response('Unauthorized',{status:401});

  const { type, productId, userIds, title, body, link } = await req.json();
  
  // web-push 라이브러리 (npm install web-push)
  let webpush;
  try {
    webpush = await import('web-push');
    webpush.setVapidDetails(
      'mailto:admin@gongguon.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (e) {
    console.log('web-push not installed, fallback to notification table only');
  }

  let targetSubs = [];
  if (userIds && userIds.length) {
    targetSubs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  } else if (productId) {
    // 해당 상품 참여자들
    const orders = await prisma.order.findMany({ where: { productId }, select: { userId: true } });
    const ids = [...new Set(orders.map(o => o.userId))];
    targetSubs = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
  }

  let sent = 0;
  for (const subRow of targetSubs) {
    try {
      const sub = JSON.parse(subRow.subscription);
      const payload = JSON.stringify({ title: title || '공구온 알림', body: body || '새 소식이 있어요', link: link || '/' });
      if (webpush) await webpush.default.sendNotification(sub, payload);
      sent++;
    } catch (e) {
      // 만료된 구독 삭제
      if (e.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { endpoint: subRow.endpoint } }).catch(()=>{});
      }
    }
    
    // 인앱 알림도 같이 생성 (백업)
    await prisma.notification.create({
      data: {
        userId: subRow.userId,
        type: type || 'GENERAL',
        title: title || '공구온 알림',
        message: body || '',
        link: link || '/'
      }
    }).catch(()=>{});
  }

  return Response.json({ success:true, sent, total: targetSubs.length });
}
