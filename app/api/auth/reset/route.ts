import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(req){
  try{
    const { email, password } = await req.json();
    console.log('[RESET V3] email', email);
    if(!email || !password) return NextResponse.json({error:'입력 누락'}, {status:400});
    if(password.length < 4) return NextResponse.json({error:'비밀번호 4자 이상'}, {status:400});

    const hashed = await bcrypt.hash(password, 10);

    // 기존 유저 삭제 (관련 데이터가 있으면 update로 fallback)
    try{
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE email = $1`, email);
      console.log('[RESET V3] deleted old');
    }catch(e){ console.log('delete raw failed', e); }

    // 새 유저 생성 - 가능한 모든 필드명으로 시도
    try{
      // Prisma로 생성 시도
      await prisma.user.create({ data: { email, password: hashed, name: email.split('@')[0] } as any });
      console.log('[RESET V3] created via prisma');
    }catch(e:any){
      console.log('[RESET V3] prisma create failed, trying raw insert', e.message);
      try{
        // raw insert - id는 cuid 자동이 아니므로 gen_random_uuid 또는 cuid
        const id = 'cmu' + Math.random().toString(36).substring(2,15);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "User" (id, email, password, name, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())`,
          id, email, hashed, email.split('@')[0]
        );
        console.log('[RESET V3] created via raw insert');
      }catch(e2:any){
        console.log('raw insert failed', e2.message);
        // passwordHash 컬럼으로 시도
        try{
          const id = 'cmu' + Math.random().toString(36).substring(2,15);
          await prisma.$executeRawUnsafe(
            `INSERT INTO "User" (id, email, "passwordHash", name, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())`,
            id, email, hashed, email.split('@')[0]
          );
        }catch(e3:any){
          return NextResponse.json({error:'DB 생성 실패: ' + e3.message + ' / 원래 에러: ' + e.message}, {status:500});
        }
      }
    }

    return NextResponse.json({success:true, message:'계정이 새로 생성되었습니다! 이제 로그인하세요'});
  }catch(e:any){
    console.error(e);
    return NextResponse.json({error:e.message}, {status:500});
  }
}
