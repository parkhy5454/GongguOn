const { prisma } = require('./prisma');

async function notify(userId, { type, title, body, url }) {
  const n = await prisma.notification.create({
    data: { userId, type, title, body, url: url || null },
  });
  const io = global.__io;
  if (io) io.to(`user:${userId}`).emit('notification', n);
  return n;
}

module.exports = { notify };
