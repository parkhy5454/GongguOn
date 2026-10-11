import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { notify } from '@/lib/notify';
import { parseCsv } from '@/lib/csv';

const MAX_ROWS = 1000;

// 송장번호 일괄 등록: "정산/참여자 CSV"로 내려받은 파일에 택배사·송장번호를 채워서 올리면 한 번에 반영돼요.
// 필요한 열: 주문번호, 택배사, 송장번호 (맨 윗줄에 이 이름의 제목이 있어야 해요)
export async function POST(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (event.hostId !== user.id) return NextResponse.json({ error: '공구 개설자만 등록할 수 있어요.' }, { status: 403 });

  const { csv } = await req.json();
  if (typeof csv !== 'string' || !csv.trim()) return NextResponse.json({ error: '파일 내용이 비어 있어요.' }, { status: 400 });
  if (csv.length > 2_000_000) return NextResponse.json({ error: '파일이 너무 커요.' }, { status: 400 });

  const rows = parseCsv(csv);
  if (rows.length < 2) return NextResponse.json({ error: '데이터 행이 없어요.' }, { status: 400 });
  if (rows.length - 1 > MAX_ROWS) return NextResponse.json({ error: `한 번에 ${MAX_ROWS}건까지만 등록할 수 있어요.` }, { status: 400 });

  const header = rows[0].map((h) => h.trim());
  const idx = {
    id: header.indexOf('주문번호'),
    company: header.indexOf('택배사'),
    number: header.indexOf('송장번호'),
  };
  if (idx.id < 0 || idx.company < 0 || idx.number < 0) {
    return NextResponse.json({ error: '맨 윗줄에 "주문번호", "택배사", "송장번호" 제목이 필요해요. (정산/참여자 CSV를 내려받아 이어서 작성하세요)' }, { status: 400 });
  }

  const orders = await prisma.order.findMany({ where: { eventId: params.id }, select: { id: true, buyerId: true, paymentStatus: true } });
  const byId = new Map(orders.map((o) => [o.id, o]));

  let updated = 0;
  const skipped = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const orderId = (row[idx.id] || '').trim();
    const company = (row[idx.company] || '').trim();
    const number = (row[idx.number] || '').trim();
    const line = r + 1;
    if (!orderId && !company && !number) continue;
    if (!number) { skipped.push({ line, reason: '송장번호가 비어 있어요' }); continue; }
    if (company.length > 30 || number.length > 40) { skipped.push({ line, reason: '택배사/송장번호가 너무 길어요' }); continue; }
    const order = byId.get(orderId);
    if (!order) { skipped.push({ line, reason: '이 공구의 주문번호가 아니에요' }); continue; }
    if (order.paymentStatus !== 'CONFIRMED') { skipped.push({ line, reason: '결제 완료된 주문만 등록할 수 있어요' }); continue; }

    await prisma.order.update({ where: { id: order.id }, data: { trackingCompany: company || null, trackingNumber: number } });
    await notify(order.buyerId, {
      type: 'tracking_added',
      title: '송장번호가 등록됐어요',
      body: `"${event.title}" 주문 · ${company} ${number}`,
      url: `/events/${event.id}`,
    });
    updated++;
  }

  const io = global.__io;
  if (io && updated > 0) io.to(`event:${event.id}`).emit('order-updated', { eventId: event.id });

  return NextResponse.json({ updated, skipped });
}
