import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(req){
  try{
    const { email, password } = await req.json();
    console.log('[LOGIN] attempt', email);

    if(!email || !password) return NextResponse.json({error:'이메일과 비밀번호를 입력하세요'}, {status:400});

    const user = await prisma.user.findFirst({ where: { email } });
    if(!user) return NextResponse.json({error:'존재하지 않는 이메일입니다'}, {status:401});

    const valid = await bcrypt.compare(password, user.password || '');
    if(!valid) return NextResponse.json({error:'비밀번호가 틀렸습니다'}, {status:401});

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'gongguon-dev-secret-2024';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });

    const res = NextResponse.json({ success:true, user: { id:user.id, email:user.email, name:user.name } });
    res.cookies.set('token', token, { httpOnly:true, maxAge: 60*60*24*7 });
    return res;
  }catch(e){
    console.error('[LOGIN ERROR]', e);
    return NextResponse.json({error:'서버 오류: ' + (e.message || 'unknown') + ' - Render 환경변수 확인 필요'}, {status:500});
  }
}
