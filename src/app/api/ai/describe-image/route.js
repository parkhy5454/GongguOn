import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authServer';

const GEMINI_MODEL = 'gemini-2.5-flash';

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'AI 자동 작성을 쓰려면 서버에 GEMINI_API_KEY 환경변수가 설정되어 있어야 해요.' },
      { status: 500 }
    );
  }

  const { imageUrl } = await req.json();
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return NextResponse.json({ error: '유효한 이미지가 아니에요.' }, { status: 400 });
  }

  let base64;
  let mediaType = 'image/jpeg';
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('fetch failed');
    mediaType = imgRes.headers.get('content-type') || mediaType;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    base64 = buf.toString('base64');
  } catch (err) {
    return NextResponse.json({ error: '이미지를 불러오는 데 실패했어요.' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    '이 사진은 공동구매 상품 사진이야. 이 상품을 위한 짧은 제목(20자 이내)과 설명(2~3문장, 구매자에게 매력적으로)을 한국어로 작성해줘. ' +
                    '반드시 아래 JSON 형식으로만, 다른 텍스트 없이 응답해: {"title": "...", "description": "..."}',
                },
                { inline_data: { mime_type: mediaType, data: base64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `AI 호출에 실패했어요: ${errText.slice(0, 200)}` }, { status: 500 });
    }
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI 응답을 해석하지 못했어요. 다시 시도해주세요.' }, { status: 500 });
    }
    return NextResponse.json({ title: parsed.title || '', description: parsed.description || '' });
  } catch (err) {
    return NextResponse.json({ error: 'AI 호출 중 오류가 발생했어요.' }, { status: 500 });
  }
}
