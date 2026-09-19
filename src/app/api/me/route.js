import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { prisma } from '@/lib/prisma';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const agg = await prisma.review.aggregate({
    where: { targetId: user.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return NextResponse.json({
    user: {
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      defaultAddress: user.defaultAddress,
      rating: agg._avg.rating || null,
      reviewCount: agg._count.rating,
      referralCode: user.referralCode,
      pointBalance: user.pointBalance,
      isAdmin: isAdminEmail(user.email),
    },
  });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { name, phone, defaultAddress } = await req.json();
  const data = {};
  if (typeof name === 'string') {
    if (!name.trim()) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
    data.name = name.trim();
  }
  if (typeof phone === 'string') {
    data.phone = phone.trim() || null;
  }
  if (typeof defaultAddress === 'string') {
    data.defaultAddress = defaultAddress.trim() || null;
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });

  return NextResponse.json({ user: { id: updated.id, name: updated.name, phone: updated.phone, defaultAddress: updated.defaultAddress } });
}
