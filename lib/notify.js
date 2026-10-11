const { prisma } = require('./prisma');

async function notify(userId, { type, title, body, url }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mutedNotificationTypes: true } });
  if (user?.mutedNotificationTypes?.includes(type)) return null;

  const n = await prisma.notification.create({
    data: { userId, type, title, body, url: url || null },
  });
  const io = global.__io;
  if (io) io.to(`user:${userId}`).emit('notification', n);
  return n;
}

module.exports = { notify };
