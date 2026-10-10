
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /api/seller/tracking-bulk
// body: { orders: [{orderId, carrier, trackingNumber}] }
export async function POST(req) {
  try {
    const { orders } = await req.json();
    const results = [];

    for (const item of orders) {
      const { orderId, carrier, trackingNumber } = item;
      if (!orderId || !trackingNumber) continue;

      // Update order
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          carrier: carrier || 'CJ대한통운',
          trackingNumber,
          shippingStatus: 'SHIPPING',
          shippedAt: new Date(),
        },
      });

      // Create notification for buyer
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          type: 'SHIPPING_STARTED',
          title: '배송이 시작되었어요! 🚚',
          message: `${carrier || '택배'} ${trackingNumber} - 배송조회가 가능합니다.`,
          link: `/my/orders/${orderId}`,
        },
      });

      results.push({ orderId, success: true });
    }

    return Response.json({ success: true, updated: results.length, results });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
