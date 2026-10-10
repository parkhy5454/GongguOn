
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req) {
  const { productId, action, adminEmail } = await req.json();
  // adminEmail check
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').includes(adminEmail);
  if (!allowed) return Response.json({error:'forbidden'},{status:403});

  if (action === 'BLIND') {
    await prisma.product.update({ where: { id: productId }, data: { status: 'BLINDED' } });
  } else if (action === 'FORCE_CLOSE') {
    await prisma.product.update({ where: { id: productId }, data: { status: 'CLOSED' } });
  } else if (action === 'FORCE_CANCEL') {
    await prisma.product.update({ where: { id: productId }, data: { status: 'CANCELLED' } });
    // 환불 로직
  }

  await prisma.securityLog.create({ data: { userId: adminEmail, type: `ADMIN_${action}`, detail: productId } });

  return Response.json({ success:true });
}
