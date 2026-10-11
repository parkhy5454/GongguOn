const { prisma } = require('./prisma');

// DB 기반 레이트 리밋. 메모리 기반과 달리 서버 재배포/재시작에도 카운트가 유지됩니다.
async function checkRateLimit(key, { max, windowMs }) {
  const now = new Date();

  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!bucket || now - bucket.windowStart > windowMs) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      update: { count: 1, windowStart: now },
      create: { key, count: 1, windowStart: now },
    });
    return { allowed: true };
  }

  if (bucket.count >= max) {
    const retryAfterMs = windowMs - (now - bucket.windowStart);
    return { allowed: false, retryAfterMs };
  }

  await prisma.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  return { allowed: true };
}

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

module.exports = { checkRateLimit, getClientIp };
