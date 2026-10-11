import { NextResponse } from 'next/server';

// 서버를 깨워두기 위한 가벼운 확인용 주소 (DB를 건드리지 않음 → Neon 무료 사용량을 아낌)
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ ok: true });
}
