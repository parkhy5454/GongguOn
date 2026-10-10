
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET /api/cron/auto-confirm?secret=xxx - 배송완료 7일 후 자동 구매확정
export async function GET(req) {
  const secret = new URL(req.url).searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) return new Response('Unauthorized',{status:401});

  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
  const toConfirm = await prisma.order.findMany({
    where: { shippingStatus: 'DELIVERED', isConfirmed: false, shippedAt: { lte: sevenDaysAgo } }
  });

  for (const order of toConfirm) {
    await prisma.order.update({ where: { id: order.id }, data: { isConfirmed: true, confirmedAt: new Date(), status: 'CONFIRMED' } });
    await prisma.settlementQueue.create({
      data: { orderId: order.id, sellerId: order.sellerId, amount: order.paidAmount, status: 'READY' }
    }).catch(()=>{});
  }
  return Response.json({ success:true, count: toConfirm.length });
}
