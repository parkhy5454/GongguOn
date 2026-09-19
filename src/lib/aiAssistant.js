const { prisma } = require('./prisma');
const bcrypt = require('bcryptjs');

const AI_EMAIL = 'ai-assistant@gonggu-on.local';

async function getOrCreateAIUser() {
  let aiUser = await prisma.user.findUnique({ where: { email: AI_EMAIL } });
  if (!aiUser) {
    const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
    const { generateUniqueReferralCode } = require('./referral');
    const referralCode = await generateUniqueReferralCode();
    aiUser = await prisma.user.create({
      data: { email: AI_EMAIL, name: 'AI 도우미 🤖', passwordHash, referralCode },
    });
  }
  return aiUser;
}

async function generateAIReply(event, question) {
  if (!process.env.GEMINI_API_KEY) return null;

  const optionsText = event.options.map((o) => `${o.name}: ${o.price.toLocaleString()}원 (남은 수량 ${o.stock - o.soldCount}개)`).join(', ');

  const prompt =
    `너는 공동구매 플랫폼의 상품 문의 응대 도우미야. 아래 상품 정보를 참고해서 구매자의 질문에 짧고 친절하게(2~3문장 이내) 한국어로 답해줘. ` +
    `정보에 없는 내용(예: 정확한 배송일, 판매자 개인 사정)은 추측하지 말고 "판매자에게 확인이 필요해요"라고 답해. 이모지는 적당히만 사용해.\n\n` +
    `[상품명] ${event.title}\n[설명] ${event.description || '없음'}\n[옵션] ${optionsText}\n[마감일] ${new Date(event.deadline).toLocaleString('ko-KR')}\n[최소 성사 수량] ${event.minQuantity}개\n\n` +
    `[구매자 질문] ${question}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

module.exports = { getOrCreateAIUser, generateAIReply, AI_EMAIL };
