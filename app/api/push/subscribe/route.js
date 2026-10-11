import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

// 이 기기의 푸시 알림 구독 저장
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { endpoint, keys } = await req.json();
  if (!endpoint || typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) {
    return NextResponse.json({ error: '구독 정보가 올바르지 않아요.' }, { status: 400 });
  }
  // 한 사용자당 기기 수 제한(남용 방지)
  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!existing && count >= 10) return NextResponse.json({ error: '알림을 받을 수 있는 기기는 최대 10대예요.' }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ ok: true });
}

// 이 기기의 구독 해제
export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (!endpoint) return NextResponse.json({ error: 'endpoint가 필요해요.' }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}
