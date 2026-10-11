const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { verifyToken, getTokenFromCookieHeader, DEFAULT_SECRET } = require('./lib/auth');

const { sendAlert } = require('./lib/alert');

// 예상치 못한 오류로 서버가 죽거나 불안정해질 때 운영자에게 알림 (ALERT_WEBHOOK_URL / 이메일 설정 시)
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
  sendAlert('처리되지 않은 오류(unhandledRejection)', String((reason && reason.stack) || reason)).catch(() => {});
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  sendAlert('서버 치명적 오류(uncaughtException)', String((err && err.stack) || err))
    .catch(() => {})
    .finally(() => process.exit(1));
});

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

// 운영 환경에서 JWT_SECRET을 설정하지 않으면 코드에 있는 기본값이 그대로 쓰여서
// 누구나 로그인 토큰을 위조할 수 있는 심각한 보안 문제가 생기므로, 서버 시작을 아예 막습니다.
if (!dev && (process.env.JWT_SECRET || DEFAULT_SECRET) === DEFAULT_SECRET) {
  console.error(
    '🚨 JWT_SECRET 환경변수가 설정되지 않았어요. Render 환경변수에 JWT_SECRET을 랜덤 문자열로 반드시 설정해주세요.'
  );
  process.exit(1);
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, { path: '/socket.io' });

  io.use((socket, next2) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = getTokenFromCookieHeader(cookieHeader);
    const payload = token ? verifyToken(token) : null;
    if (!payload || !payload.sub || payload.purpose) return next2(new Error('unauthorized'));
    socket.user = payload;
    next2();
  });

  io.on('connection', (socket) => {
    if (socket.user?.sub) socket.join(`user:${socket.user.sub}`);
    socket.on('join-event', (eventId) => socket.join(`event:${eventId}`));
    socket.on('leave-event', (eventId) => socket.leave(`event:${eventId}`));
  });

  global.__io = io;

  httpServer.listen(port, () => {
    console.log(`> GongguOn ready on http://${hostname}:${port}`);
  });
});
