const { prisma } = require('./prisma');

async function logAdminAction(adminId, action, detail) {
  await prisma.adminActionLog.create({ data: { adminId, action, detail: detail || null } }).catch(() => {});
}

module.exports = { logAdminAction };
