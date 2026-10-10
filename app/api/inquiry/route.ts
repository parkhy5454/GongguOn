import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const u = await getCurrentUser();

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[Inquiry API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 입력값 검증
    if (!body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(body.email))) {
      return NextResponse.json(
        { error: "유효한 이메일 주소를 입력해주세요." },
        { status: 400 }
      );
    }

    // 길이 제한
    const subject = String(body.subject).trim();
    const message = String(body.message).trim();

    if (subject.length === 0 || message.length === 0) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: "제목은 200자 이내여야 합니다." },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "내용은 5000자 이내여야 합니다." },
        { status: 400 }
      );
    }

    // 문의 저장
    await db.inquiry.create({
      data: {
        userId: u?.id,
        email: String(body.email).toLowerCase().trim(),
        subject: subject.slice(0, 200),
        message: message.slice(0, 5000),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Inquiry API] 에러:", error);
    return NextResponse.json(
      { error: "문의 접수 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
