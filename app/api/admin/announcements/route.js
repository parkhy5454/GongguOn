import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import { logAdminAction } from '@/lib/adminLog';

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && isAdminEmail(user.email) ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ announcements });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { title, body } = await req.json();
  if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });
  if (title.length > 80 || body.length > 500) return NextResponse.json({ error: '제목은 80자, 내용은 500자 이내로 입력해주세요.' }, { status: 400 });
  const a = await prisma.announcement.create({ data: { title: title.trim(), body: body.trim() } });
  await logAdminAction(admin.id, 'announcement_create', a.title);
  return NextResponse.json({ announcement: a });
}
