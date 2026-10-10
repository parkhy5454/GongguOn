import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let b;
    try {
      b = await req.json();
    } catch (parseError) {
      console.error("[Register API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { email, password, name } = b;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "이메일, 비밀번호, 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { email: String(email).toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: String(email).toLowerCase(),
        passwordHash: hashedPassword,
        name: String(name),
        isActive: true,
      },
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Register API] 예상치 못한 에러:", error);
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
