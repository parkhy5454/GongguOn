import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 가입 완료 화면이 "카카오에서 받아온 이름/이메일"을 미리 채우기 위해 조회
export async function GET(req) {
  const c = req.cookies.get('kakao_pending')?.value;
  const p = c ? verifyToken(c) : null;
  if (!p || p.purpose !== 'kakao_signup') return NextResponse.json({ error: 'expired' }, { status: 401 });
  return NextResponse.json({ name: p.name || '', email: p.email || '', hasEmail: !!p.email });
}
