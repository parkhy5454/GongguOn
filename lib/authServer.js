const { cookies } = require('next/headers');
const { COOKIE_NAME, verifyToken } = require('./auth');
const { prisma } = require('./prisma');

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) return null;
  // tokenVersion이 다르면(비밀번호 변경/전체 로그아웃 등으로 무효화된) 구 토큰이므로 거부
  if (typeof payload.tv === 'number' && payload.tv !== user.tokenVersion) return null;
  return user;
}

module.exports = { getCurrentUser };
