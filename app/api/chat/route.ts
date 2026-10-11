import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } } | any,
) {
  const u = await requireUser();
  const m = await db.match.findUnique({
    where: { id: params.id },
    include: { userA: true, userB: true },
  });
  if (!m || ![m.userAId, m.userBId].includes(u.id))
    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 },
    );
  const msgs = await db.message.findMany({
    where: { matchId: m.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const other = m.userAId === u.id ? m.userB : m.userA;
  return NextResponse.json({
    other: { name: other.name, photoUrl: other.photoUrl },
    messages: msgs.map((x) => ({ ...x, mine: x.senderId === u.id })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } | any,
) {
  try {
    const u = await requireUser();
    const m = await db.match.findUnique({ where: { id: params.id } });
    if (!m || ![m.userAId, m.userBId].includes(u.id) || !m.isActive)
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 },
      );

    let b;
    try {
      b = await req.json();
    } catch (parseError) {
      console.error("[Chat API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    let body = String(b.body || "").trim().slice(0, 1000);

    if (!body)
      return NextResponse.json(
        { error: "메시지를 입력해주세요." },
        { status: 400 },
      );

    // 메시지 저장
    const receiverId = m.userAId === u.id ? m.userBId : m.userAId;
    await db.message.create({
      data: { matchId: m.id, senderId: u.id, receiverId, body },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Chat API] 예상치 못한 에러:", error);
    return NextResponse.json(
      { error: "메시지 전송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
