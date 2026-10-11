import { NextResponse } from 'next/server';
import { kakaoEnabled } from '@/lib/kakao';

// 로그인/가입 화면이 "어떤 로그인 방법을 보여줄지" 물어보는 용도 (환경변수가 설정된 것만 true)
export async function GET() {
  return NextResponse.json({ kakao: kakaoEnabled() });
}
