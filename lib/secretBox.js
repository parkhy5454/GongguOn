const crypto = require('crypto');

// 2단계 인증 비밀키 등을 DB에 "암호화해서" 저장하기 위한 도구 (AES-256-GCM).
// 암호화 키는 JWT_SECRET에서 만들어요. (JWT_SECRET을 바꾸면 저장된 2FA 비밀키는 풀 수 없게 되므로,
// 그 경우 2FA를 새로 설정해야 합니다.)
function getKey() {
  const base = process.env.JWT_SECRET || 'dev-secret-change-me';
  return crypto.createHash('sha256').update(`gongguon-secretbox:${base}`).digest();
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64')).join('.');
}

function decrypt(payload) {
  try {
    const [iv, tag, enc] = payload.split('.').map((x) => Buffer.from(x, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

module.exports = { encrypt, decrypt };
