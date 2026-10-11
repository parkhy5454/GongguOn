import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_: NextRequest) {
  const u = await requireUser();
  const profile = await db.user.findUnique({
    where: { id: u.id },
    select: {
      id: true,
      email: true,
      name: true,
      age: true,
      gender: true,
      mbti: true,
      region: true,
      bio: true,
      photoUrl: true,
      privacyPublic: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const u = await requireUser();

  try {
    const body = await req.json();

    const updated = await db.user.update({
      where: { id: u.id },
      data: {
        name: body.name || undefined,
        bio: body.bio || undefined,
        region: body.region || undefined,
        gender: body.gender || undefined,
        age: body.age ? Number(body.age) : undefined,
        mbti: body.mbti || undefined,
        privacyPublic: body.privacyPublic !== false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        region: true,
        gender: true,
        age: true,
        mbti: true,
        photoUrl: true,
        privacyPublic: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Profile API] 에러:", error);
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
