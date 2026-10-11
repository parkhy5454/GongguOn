import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { logAdminAction } from '@/lib/adminLog';

function csvEscape(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return new Response('forbidden', { status: 403 });
  }

  const orders = await prisma.order.findMany({
    where: { paymentStatus: 'CONFIRMED' },
    include: {
      event: { select: { title: true, host: { select: { name: true, email: true } } } },
      option: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const header = ['판매자', '판매자이메일', '공구명', '옵션', '수량', '결제금액', '쿠폰할인(공구온 부담)', '정산대상금액', '결제수단', '정산상태', '정산일시', '참여일시'];
  const rows = orders.map((o) => [
    o.event.host.name,
    o.event.host.email,
    o.event.title,
    o.option.name,
    o.quantity,
    o.amount,
    o.couponDiscount || 0,
    o.amount + (o.couponDiscount || 0),
    o.paymentMethod === 'CARD' ? '카드결제' : o.paymentMethod === 'VIRTUAL_ACCOUNT' ? '가상계좌' : '계좌이체',
    o.settledAt ? '정산완료' : '미정산',
    o.settledAt ? new Date(o.settledAt).toLocaleString('ko-KR') : '',
    new Date(o.createdAt).toLocaleString('ko-KR'),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const bom = '\uFEFF';

  await logAdminAction(user.id, 'settlement_csv_export', `rows=${rows.length}`);

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gonggu-on_settlements_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
