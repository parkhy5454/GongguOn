import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { logAdminAction } from '@/lib/adminLog';

export async function PATCH(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const admin = await getCurrentUser();
  if (!admin || !isAdminEmail(admin.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { active } = await req.json();
  const a = await prisma.announcement.update({ where: { id: params.id }, data: { active: !!active } }).catch(() => null);
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await logAdminAction(admin.id, 'announcement_toggle', `${a.title} active=${a.active}`);
  return NextResponse.json({ announcement: a });
}

export async function DELETE(req, { params: paramsPromise }) {
  const params = await paramsPromise;
  const admin = await getCurrentUser();
  if (!admin || !isAdminEmail(admin.email)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const a = await prisma.announcement.delete({ where: { id: params.id } }).catch(() => null);
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await logAdminAction(admin.id, 'announcement_delete', a.title);
  return NextResponse.json({ ok: true });
}
