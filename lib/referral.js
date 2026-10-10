const { prisma } = require('./prisma');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 글자(0,O,1,I) 제외

function randomCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

async function generateUniqueReferralCode() {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return randomCode(8);
}

const PURCHASE_REFERRER_BONUS = 3000;
const PURCHASE_REFEREE_BONUS = 2000;
const EVENT_REFERRER_BONUS = 2000;
const EVENT_REFEREE_BONUS = 1000;

module.exports = {
  generateUniqueReferralCode,
  PURCHASE_REFERRER_BONUS,
  PURCHASE_REFEREE_BONUS,
  EVENT_REFERRER_BONUS,
  EVENT_REFEREE_BONUS,
};
