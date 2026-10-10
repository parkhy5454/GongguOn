import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(req){
  try{
    const { email, password, name } = await req.json();
    if(!email || !password) return NextResponse.json({error:'필수 입력 누락'}, {status:400});
    
    const exists = await prisma.user.findFirst({ where: { email } });
    if(exists) return NextResponse.json({error:'이미 존재하는 이메일'}, {status:409});

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, name: name || email.split('@')[0] } });
    return NextResponse.json({success:true, user:{id:user.id, email:user.email}});
  }catch(e){
    console.error('[SIGNUP ERROR]', e);
    return NextResponse.json({error:'서버 오류: ' + e.message}, {status:500});
  }
}
