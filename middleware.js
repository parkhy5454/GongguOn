import { NextResponse } from 'next/server';
export function middleware(request){
  console.log('[MIDDLEWARE DISABLED] allowing', request.nextUrl.pathname);
  return NextResponse.next();
}
export const config = {
  matcher: [] // 아무 경로도 매칭 안함 = 미들웨어 완전 비활성화
};
