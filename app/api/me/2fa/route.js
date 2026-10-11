import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';

// 2단계 인증 상태 조회 (관리자 계정만 대상)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ eligible: isAdminEmail(user.email), enabled: !!user.totpEnabled });
}
