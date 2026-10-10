import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 만료된 지 오래된 인증/재설정 토큰을 정리합니다.
// https://your-app.onrender.com/api/cron/cleanup-tokens?secret=CRON_SECRET값 (하루 1회 정도면 충분)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const oldBucketCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [resetDeleted, verifyDeleted, bucketDeleted] = await Promise.all([
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.rateLimitBucket.deleteMany({ where: { windowStart: { lt: oldBucketCutoff } } }),
  ]);

  return NextResponse.json({
    passwordResetTokensDeleted: resetDeleted.count,
    emailVerificationTokensDeleted: verifyDeleted.count,
    rateLimitBucketsDeleted: bucketDeleted.count,
  });
}
