const { prisma } = require('./prisma');
const { sendPushToUser } = require('./push');

async function notify(userId, { type, title, body, url }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mutedNotificationTypes: true } });
  if (user?.mutedNotificationTypes?.includes(type)) return null;

  const n = await prisma.notification.create({
    data: { userId, type, title, body, url: url || null },
  });
  const io = global.__io;
  if (io) io.to(`user:${userId}`).emit('notification', n);

  // 폰/PC 푸시 알림 (설정돼 있고 구독한 기기가 있을 때만). 기다리지 않고 백그라운드로 보냄
  sendPushToUser(userId, { title, body, url }).catch(() => {});
  return n;
}

module.exports = { notify };
