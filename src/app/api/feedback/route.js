import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';
import { LIMITS, tooLong } from '@/lib/limits';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { category, content } = await req.json();
  const validCategories = ['BUG', 'SUGGESTION', 'OTHER'];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: '카테고리를 선택해주세요.' }, { status: 400 });
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  }
  if (tooLong(content, LIMITS.feedbackContent)) {
    return NextResponse.json({ error: `내용은 ${LIMITS.feedbackContent}자 이내로 입력해주세요.` }, { status: 400 });
  }

  const feedback = await prisma.feedback.create({
    data: { userId: user.id, category, content: content.trim() },
  });

  return NextResponse.json({ feedback });
}
