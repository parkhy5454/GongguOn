
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req) {
  const { productId, userId, reason } = await req.json();

  const report = await prisma.report.create({ data: { productId, userId, reason } });

  const count = await prisma.report.count({ where: { productId } });

  if (count >= 3) {
    await prisma.product.update({ where: { id: productId }, data: { status: 'BLINDED', blindedReason: `신고 ${count}회 누적 자동 블라인드` } });
    // 관리자에게 알림
    await prisma.notification.create({
      data: { userId: 'admin', type: 'REPORT_BLIND', title: `상품 자동 블라인드: ${productId}`, message: `신고 ${count}회로 자동 블라인드 처리됨`, link: `/admin/reports` }
    }).catch(()=>{});
  }

  return Response.json({ success:true, reportCount: count, blinded: count >=3 });
}
