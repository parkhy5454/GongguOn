// 우리 사이트의 주소(https://...)를 구해요. Render 환경변수 APP_URL을 넣어두면 그 값을 최우선으로 씁니다.
function getOrigin(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const proto = req.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return `${proto}://${host}`;
}

// 로그인 후 돌아갈 주소(next)는 우리 사이트 안의 경로만 허용 (피싱용 외부 주소 차단)
function safeNext(next, fallback = '/events') {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (next.length > 300) return fallback;
  return next;
}

module.exports = { getOrigin, safeNext };
