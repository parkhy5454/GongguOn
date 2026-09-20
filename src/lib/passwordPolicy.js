// 최소 8자, 영문자 1개 이상 + 숫자 1개 이상 포함
function validatePassword(password) {
  if (!password || password.length < 8) {
    return '비밀번호는 8자 이상이어야 해요.';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return '비밀번호에 영문자를 1개 이상 포함해주세요.';
  }
  if (!/[0-9]/.test(password)) {
    return '비밀번호에 숫자를 1개 이상 포함해주세요.';
  }
  return null; // 통과
}

module.exports = { validatePassword };
