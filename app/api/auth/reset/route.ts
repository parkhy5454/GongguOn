import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(req){
  try{
    const { email, password } = await req.json();
    console.log('[RESET] email', email);
    if(!email || !password) return NextResponse.json({error:'입력 누락'}, {status:400});

    const user = await prisma.user.findFirst({ where:{ email } });
    if(!user) return NextResponse.json({error:'해당 이메일 계정 없음. /signup에서 가입하세요'}, {status:404});

    console.log('[RESET] found user', user.id, 'keys:', Object.keys(user));

    const hashed = await bcrypt.hash(password, 10);

    // 모든 가능한 비밀번호 필드명으로 시도
    const possibleFields = ['password','passwordHash','hashedPassword','pwd'];
    let updated = false;
    let lastError = null;

    for(const field of possibleFields){
      try{
        if(!(field in user) && field !== 'password'){
          // 스키마에 없는 필드는 prisma가 에러냄, 그래도 시도
        }
        const data:any = {};
        data[field] = hashed;
        // raw query로 안전하게 업데이트 (필드명 동적)
        // prisma는 알 수 없는 필드를 에러내므로 try-catch로 시도
        await prisma.$executeRawUnsafe(`UPDATE "User" SET "${field}" = $1 WHERE id = $2`, hashed, user.id);
        console.log(`[RESET] success with raw field ${field}`);
        updated = true;
        break;
      }catch(e:any){
        lastError = e.message;
        console.log(`[RESET] failed field ${field}:`, e.message);
        // prisma client로도 시도
        try{
          const data:any = {}; data[field]=hashed;
          await (prisma.user as any).update({ where:{ id:user.id }, data });
          updated=true; break;
        }catch(e2){ lastError = (e2 as any).message; }
      }
    }

    // 최후: 모든 레코드 raw로 password 컬럼이 존재하면 업데이트
    if(!updated){
      try{
        await prisma.$executeRaw`UPDATE "User" SET password = ${hashed} WHERE id = ${user.id}`;
        updated=true;
      }catch(e:any){ lastError = e.message; }
    }

    if(!updated){
      return NextResponse.json({error:'비밀번호 필드를 찾을 수 없습니다. DB 스키마: ' + Object.keys(user).join(', ') + ' / 마지막 에러: ' + lastError}, {status:500});
    }

    return NextResponse.json({success:true, message:'비밀번호 변경 완료'});
  }catch(e:any){
    console.error('[RESET ERROR]', e);
    return NextResponse.json({error: e.message || '서버 오류'}, {status:500});
  }
}
