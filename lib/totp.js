const crypto = require('crypto');
const { encrypt, decrypt } = require('./secretBox');

// RFC 6238 TOTP (구글 OTP / Microsoft Authenticator / Authy 등과 호환) — 외부 라이브러리 없이 구현
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of str.replace(/=+$/, '').toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20)); // 160bit
}

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1000000).padStart(6, '0');
}

// 현재 시각 기준 ±1 구간(30초씩)까지 허용. 성공하면 사용한 step 번호를, 실패하면 null을 반환.
function verifyTotp(secret, code, now = Date.now()) {
  if (!secret || !/^\d{6}$/.test(String(code || '').trim())) return null;
  const step = Math.floor(now / 1000 / 30);
  for (let w = -1; w <= 1; w++) {
    const candidate = hotp(secret, step + w);
    const a = Buffer.from(candidate);
    const b = Buffer.from(String(code).trim());
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return step + w;
  }
  return null;
}

function otpauthUrl(email, secret) {
  const issuer = '공구온';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// 사용자 레코드의 암호화된 비밀키로 코드를 검증하고, 같은 코드의 재사용(리플레이)을 막음.
// 성공 시 { step } 반환, 실패 시 null.
function verifyUserCode(user, code) {
  if (!user.totpSecret) return null;
  const secret = decrypt(user.totpSecret);
  if (!secret) return null;
  const step = verifyTotp(secret, code);
  if (step === null) return null;
  if (user.totpLastStep != null && step <= user.totpLastStep) return null;
  return { step };
}

module.exports = { generateSecret, verifyTotp, otpauthUrl, verifyUserCode, encrypt, decrypt };
