
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /api/cron/factory-orders?secret=CRON_SECRET
// 매주 월요일 23:59 cron-job.org에서 호출

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 마감된 선주문 상품 찾기
  const deadline = new Date();
  const preorderProducts = await prisma.product.findMany({
    where: {
      isPreorder: true,
      preorderDeadline: { lte: deadline },
      status: 'RECRUITING'
    },
    include: { orders: true }
  });

  const factoryOrders = [];
  for (const product of preorderProducts) {
    const totalQty = product.orders.reduce((sum, o) => sum + o.quantity, 0);
    if (totalQty === 0) continue;

    // 옵션별 breakdown
    const breakdown = {};
    product.orders.forEach(o => {
      const key = o.option || 'default';
      breakdown[key] = (breakdown[key] || 0) + o.quantity;
    });

    // FactoryOrder 생성
    const fo = await prisma.factoryOrder.create({
      data: {
        productId: product.id,
        totalQty,
        breakdown,
        status: 'PENDING'
      }
    });

    // 상품 상태를 제작중으로 변경
    await prisma.product.update({
      where: { id: product.id },
      data: { status: 'PRODUCING' }
    });

    factoryOrders.push(fo);

    // TODO: 이메일 발송 (Resend)
    // await sendFactoryEmail(product.factoryEmail, fo)
  }

  return Response.json({ success: true, count: factoryOrders.length, factoryOrders });
}
