const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { verifyToken, getTokenFromCookieHeader } = require('./src/lib/auth');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: '/socket.io',
  });

  io.use((socket, next2) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = getTokenFromCookieHeader(cookieHeader);
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return next2(new Error('unauthorized'));
    }
    socket.user = payload;
    next2();
  });

  io.on('connection', (socket) => {
    socket.on('join-channel', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave-channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });
  });

  // Expose io globally so API routes can emit events
  global.__io = io;

  httpServer.listen(port, () => {
    console.log(`> WorkTalk ready on http://${hostname}:${port}`);
  });
});
