
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /api/orders/confirm - 구매확정 (구매자가 배송완료 후 누름, 7일 후 자동확정)
export async function POST(req) {
  const { orderId, userId } = await req.json();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return Response.json({error:'not found'},{status:404});
  if (order.userId !== userId) return Response.json({error:'forbidden'},{status:403});
  if (order.shippingStatus !== 'DELIVERED') return Response.json({error:'배송완료 후 확정 가능'},{status:400});
  if (order.isConfirmed) return Response.json({error:'이미 확정됨'},{status:400});

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { isConfirmed: true, confirmedAt: new Date(), status: 'CONFIRMED' }
  });

  // 정산 가능 상태로 변경
  await prisma.settlementQueue.create({
    data: { orderId, sellerId: order.sellerId, amount: order.paidAmount, status: 'READY' }
  });

  return Response.json({ success:true, order: updated });
}
