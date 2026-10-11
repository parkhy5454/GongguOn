// 서버 오류를 운영자에게 알려주는 간단한 알림 도구 (외부 라이브러리 없음).
//  - ALERT_WEBHOOK_URL : 디스코드/슬랙 웹훅 주소 (선택)
//  - ALERT_EMAIL       : 알림 받을 이메일 (없으면 ADMIN_EMAILS의 첫 번째 주소). RESEND_API_KEY가 있어야 발송됨
// 같은 오류는 10분에 한 번만 알려서 알림 폭탄을 막습니다.
const { sendEmail } = require('./email');

const recent = new Map();
const THROTTLE_MS = 10 * 60 * 1000;

function alertEmailTo() {
  if (process.env.ALERT_EMAIL) return process.env.ALERT_EMAIL.trim();
  return (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)[0] || null;
}

async function sendAlert(title, detail) {
  const key = `${title}|${String(detail).slice(0, 120)}`;
  const now = Date.now();
  if (recent.has(key) && now - recent.get(key) < THROTTLE_MS) return;
  recent.set(key, now);
  if (recent.size > 200) {
    for (const [k, t] of recent) if (now - t > THROTTLE_MS) recent.delete(k);
  }

  const text = `🚨 [공구온] ${title}\n${detail}`.slice(0, 1800);

  const tasks = [];
  if (process.env.ALERT_WEBHOOK_URL) {
    tasks.push(
      fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 디스코드는 content, 슬랙은 text 키를 사용 (둘 다 넣어 호환)
        body: JSON.stringify({ content: text, text }),
      }).catch(() => {})
    );
  }
  const to = alertEmailTo();
  if (to && process.env.RESEND_API_KEY) {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    tasks.push(
      sendEmail({ to, subject: `[공구온 오류 알림] ${title}`.slice(0, 120), html: `<pre style="white-space:pre-wrap">${esc(text)}</pre>` }).catch(() => {})
    );
  }
  await Promise.all(tasks);
}

// 요청 주소의 쿼리스트링(secret 등 민감정보 포함 가능)을 제거
function safePath(p) {
  return String(p || '').split('?')[0];
}

async function reportError(err, request, context) {
  const msg = err && err.message ? err.message : String(err);
  const stack = err && err.stack ? String(err.stack).split('\n').slice(0, 6).join('\n') : '';
  await sendAlert(
    `서버 오류 ${request?.method || ''} ${safePath(request?.path)}`.trim(),
    `${msg}\n${stack}\n(route: ${context?.routePath || '-'}, type: ${context?.routeType || '-'})`
  );
}

module.exports = { sendAlert, reportError };
