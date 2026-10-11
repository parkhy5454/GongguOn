const { signToken, COOKIE_NAME } = require('./auth');

// 로그인 쿠키를 응답에 붙임 (이메일 로그인과 카카오 로그인이 같은 방식으로 세션을 만들도록 공통화)
function attachSession(res, user) {
  const token = signToken({ sub: user.id, email: user.email, name: user.name, tv: user.tokenVersion });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

module.exports = { attachSession };
