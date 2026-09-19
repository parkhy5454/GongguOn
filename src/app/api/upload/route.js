import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '사진 용량은 8MB를 넘을 수 없어요.' }, { status: 400 });
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '이미지 파일만 업로드할 수 있어요.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });

  const safeName = (file.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  await writeFile(path.join(uploadsDir, uniqueName), buffer);

  return NextResponse.json({ url: `/uploads/${uniqueName}` });
}
