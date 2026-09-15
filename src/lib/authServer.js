const { cookies } = require('next/headers');
const { COOKIE_NAME, verifyToken } = require('./auth');
const { prisma } = require('./prisma');

async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user;
}

module.exports = { getCurrentUser };
