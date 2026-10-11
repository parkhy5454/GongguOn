import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const n = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!n || n.userId !== user.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await prisma.notification.update({ where: { id: params.id }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
