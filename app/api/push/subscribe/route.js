
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /api/push/subscribe - 구독 저장
export async function POST(req) {
  const { userId, subscription } = await req.json();
  if (!userId || !subscription) return Response.json({error: 'missing'}, {status:400});
  
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, subscription: JSON.stringify(subscription), updatedAt: new Date() },
    create: { userId, endpoint: subscription.endpoint, subscription: JSON.stringify(subscription) }
  });
  
  return Response.json({success:true});
}

// DELETE - 구독 취소
export async function DELETE(req) {
  const { endpoint } = await req.json();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return Response.json({success:true});
}
