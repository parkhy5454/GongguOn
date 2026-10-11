import { NextResponse } from 'next/server';

// 브라우저가 푸시를 구독할 때 필요한 "공개 키" (환경변수가 있을 때만 알려줌)
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null;
  return NextResponse.json({ enabled: !!publicKey, publicKey });
}
