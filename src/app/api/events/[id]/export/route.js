import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

function csvEscape(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response('unauthorized', { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return new Response('not found', { status: 404 });
  if (event.hostId !== user.id) return new Response('forbidden', { status: 403 });

  const orders = await prisma.order.findMany({
    where: { eventId: params.id },
    include: { buyer: { select: { name: true, email: true, phone: true } }, option: true },
    orderBy: { createdAt: 'asc' },
  });

  const header = ['이름', '이메일', '휴대폰', '배송지', '옵션', '수량', '단가할인율(%)', '결제금액', '포인트사용', '입금자명', '결제상태', '참여일시'];
  const rows = orders.map((o) => [
    o.buyer.name,
    o.buyer.email,
    o.buyer.phone || '',
    o.shippingAddress || '',
    o.option.name,
    o.quantity,
    o.discountPercent,
    o.amount,
    o.pointsUsed,
    o.depositorName || '',
    o.paymentStatus,
    new Date(o.createdAt).toLocaleString('ko-KR'),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const bom = '\uFEFF'; // 엑셀 한글 깨짐 방지
  const filename = `gonggu-on_${event.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_주문내역.csv`;

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
