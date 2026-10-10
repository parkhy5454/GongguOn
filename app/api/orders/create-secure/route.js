
import { PrismaClient } from '@prisma/client';
import { validateOrderPrice } from '../validate-price.js';
const prisma = new PrismaClient();

export async function POST(req) {
  const { productId, userId, quantity, clientPrice } = await req.json();

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { _count: { select: { orders: true } } } });
  if (!product) return Response.json({error:'product not found'},{status:404});

  const currentCount = product._count.orders;

  try {
    const serverPrice = validateOrderPrice(product, currentCount, clientPrice, quantity);
    // ... 이후 정상 주문 생성 로직
    // const order = await prisma.order.create({ data: {..., paidAmount: serverPrice * quantity } })
    return Response.json({ success:true, validatedPrice: serverPrice });
  } catch (e) {
    // 해킹 시도 로그
    await prisma.securityLog.create({
      data: { userId, type: 'PRICE_TAMPER', detail: e.message, ip: req.headers.get('x-forwarded-for') || 'unknown' }
    }).catch(()=>{});
    return Response.json({ error: e.message }, { status: 400 });
  }
}
