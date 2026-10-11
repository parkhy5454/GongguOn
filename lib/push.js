// 웹 푸시 알림 발송 (폰/PC 알림창). Render 환경변수:
//  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (필수), VAPID_SUBJECT (선택, 예: mailto:내이메일)
const webpush = require('web-push');
const { prisma } = require('./prisma');

let configured = null;
function configure() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) { configured = false; return false; }
  try {
    const subject = process.env.VAPID_SUBJECT
      || (process.env.APP_URL ? process.env.APP_URL : 'mailto:' + ((process.env.ADMIN_EMAILS || '').split(',')[0].trim() || 'admin@example.com'));
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch (e) {
    console.error('VAPID 설정 오류:', e.message);
    configured = false;
  }
  return configured;
}

function pushEnabled() {
  return configure();
}

// 한 사용자의 모든 기기(구독)로 알림 전송. 만료된 구독(404/410)은 자동 삭제. 실패해도 예외를 던지지 않음.
async function sendPushToUser(userId, { title, body, url }) {
  if (!configure()) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    const payload = JSON.stringify({ title, body, url: url || '/events' });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        } catch (err) {
          if (err && (err.statusCode === 404 || err.statusCode === 410)) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          }
        }
      })
    );
  } catch (e) {
    console.error('푸시 발송 오류:', e);
  }
}

module.exports = { pushEnabled, sendPushToUser };
