// 간단한 메모리 기반 레이트 리밋 (단일 인스턴스 배포 기준으로 충분)
const buckets = new Map();

function checkRateLimit(key, { max, windowMs }) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { allowed: true };
  }

  if (entry.count >= max) {
    const retryAfterMs = windowMs - (now - entry.start);
    return { allowed: false, retryAfterMs };
  }

  entry.count += 1;
  return { allowed: true };
}

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

module.exports = { checkRateLimit, getClientIp };
