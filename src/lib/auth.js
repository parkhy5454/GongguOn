const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const DEFAULT_SECRET = 'dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
const COOKIE_NAME = 'gongguon_token';

// 참고: 운영 환경에서 JWT_SECRET 미설정 여부는 서버 시작 시점(server.js)에서 검사합니다.
// 여기서 즉시 throw하지 않는 이유는, 이 파일이 `next build` 중에도 import되기 때문에
// 빌드 자체가 실패하지 않도록 하기 위함입니다.

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}
function getTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE_NAME + '='));
  if (!match) return null;
  return decodeURIComponent(match.split('=')[1]);
}

module.exports = { COOKIE_NAME, DEFAULT_SECRET, hashPassword, verifyPassword, signToken, verifyToken, getTokenFromCookieHeader };
