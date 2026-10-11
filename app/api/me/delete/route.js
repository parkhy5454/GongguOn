import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';
import { verifyPassword, COOKIE_NAME } from '@/lib/auth';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { password, confirmText } = await req.json();
  // 카카오로 가입한 회원은 비밀번호를 모를 수 있으므로 "탈퇴합니다"를 직접 입력하는 것으로 본인 확인을 대신함
  const kakaoConfirm = !!user.kakaoId && confirmText === '탈퇴합니다';
  if (!password && !kakaoConfirm) {
    return NextResponse.json({ error: user.kakaoId ? '"탈퇴합니다"를 입력하거나 비밀번호를 입력해주세요.' : '본인 확인을 위해 비밀번호를 입력해주세요.' }, { status: 400 });
  }
  const ok = kakaoConfirm || (await verifyPassword(password, user.passwordHash));
  if (!ok) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  // 진행중인(마감 전) 공구를 개설했거나, 아직 정산 안 된 매출이 있으면 탈퇴를 막음
  const openHosted = await prisma.event.count({ where: { hostId: user.id, status: 'OPEN' } });
  if (openHosted > 0) {
    return NextResponse.json({ error: '진행중인 공구가 있어 탈퇴할 수 없어요. 공구를 마감/취소한 뒤 다시 시도해주세요.' }, { status: 400 });
  }
  const unsettled = await prisma.order.count({
    where: { event: { hostId: user.id }, paymentStatus: 'CONFIRMED', settledAt: null },
  });
  if (unsettled > 0) {
    return NextResponse.json({ error: '아직 정산되지 않은 매출이 있어 탈퇴할 수 없어요. 정산 완료 후 다시 시도해주세요.' }, { status: 400 });
  }

  // 주문/리뷰/채팅 등 다른 사람과 얽힌 기록은 보존하되, 개인 식별 정보만 익명화하는 소프트 삭제 방식
  const anonymizedEmail = `deleted-${user.id}@gonggu-on.local`;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: anonymizedEmail,
      name: '탈퇴한 회원',
      phone: null,
      defaultAddress: null,
      passwordHash: 'DELETED',
      deletedAt: new Date(),
      tokenVersion: { increment: 1 },
      kakaoId: null,
      totpSecret: null,
      totpEnabled: false,
    },
  });
  // 푸시 알림 구독·차단 목록 등 개인 설정 정리
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
  await prisma.block.deleteMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}
