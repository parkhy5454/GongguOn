// Cloudflare Turnstile(무료 캡차) 서버 검증.
// TURNSTILE_SECRET_KEY가 설정되지 않으면 캡차를 쓰지 않는 것으로 보고 항상 통과시킵니다.
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token || typeof token !== 'string') return { ok: false };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await res.json();
    return { ok: !!data.success };
  } catch (e) {
    // 캡차 서버 장애 때문에 가입/로그인이 전부 막히지 않도록 통과시키되, 기록은 남김
    console.error('Turnstile 검증 오류:', e);
    return { ok: true, error: true };
  }
}

module.exports = { verifyTurnstile };
