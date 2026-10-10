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
      console.error("[Login API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const email = String(b.email || "").toLowerCase().trim();
    const password = String(b.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    console.log("[Login API] 로그인 시도:", email);

    const u = await db.user.findUnique({
      where: { email },
    });

    if (!u) {
      console.log("[Login API] 사용자 없음:", email);
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    if (!u.isActive) {
      console.log("[Login API] 비활성 사용자:", email);
      return NextResponse.json(
        { error: "비활성화된 계정입니다." },
        { status: 401 }
      );
    }

    try {
      const isValidPassword = await bcrypt.compare(password, u.passwordHash);

      if (!isValidPassword) {
        console.log("[Login API] 비밀번호 불일치:", email);
        return NextResponse.json(
          { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
          { status: 401 }
        );
      }
    } catch (bcryptError) {
      console.error("[Login API] 비밀번호 비교 에러:", bcryptError);
      return NextResponse.json(
        { error: "로그인 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 마지막 로그인 시간 업데이트
    await db.user.update({
      where: { id: u.id },
      data: { lastLoginAt: new Date() },
    });

    // 세션 생성
    await createSession(u.id);

    console.log("[Login API] 로그인 성공:", email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Login API] 예상치 못한 에러:", error);
    return NextResponse.json(
      { error: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
