import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';
export async function POST(req){
  try{
    const { email, password } = await req.json();
    if(!email || !password) return NextResponse.json({error:'입력 누락'}, {status:400});
    if(password.length < 6) return NextResponse.json({error:'비밀번호는 6자 이상'}, {status:400});
    const user = await prisma.user.findFirst({ where:{ email } });
    if(!user) return NextResponse.json({error:'해당 이메일 계정이 없습니다. /signup에서 가입하세요'}, {status:404});
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where:{ id:user.id }, data:{ password:hashed } });
    return NextResponse.json({success:true});
  }catch(e:any){
    console.error(e);
    return NextResponse.json({error:e.message}, {status:500});
  }
}
