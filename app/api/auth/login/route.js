import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(req){
  try{
    const { email, password } = await req.json();
    console.log('[LOGIN] email', email);

    const user:any = await prisma.user.findFirst({ where:{ email } });
    if(!user) return NextResponse.json({error:'존재하지 않는 이메일입니다. /signup에서 가입하세요'}, {status:401});

    console.log('[LOGIN] found user id', user.id, 'keys', Object.keys(user));

    // 가능한 모든 해시 필드 찾기
    const hash = user.password || user.passwordHash || user.hashedPassword || user.pwd || null;
    console.log('[LOGIN] hash exists?', !!hash, 'preview', hash?.substring(0,10));

    if(!hash){
      return NextResponse.json({error:'이 계정에 비밀번호가 설정되지 않았습니다. /reset-password에서 재설정하세요'}, {status:401});
    }

    const valid = await bcrypt.compare(password, hash);
    console.log('[LOGIN] valid?', valid);
    if(!valid) return NextResponse.json({error:'비밀번호가 틀렸습니다. /reset-password에서 재설정하세요'}, {status:401});

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'gongguon-dev-secret-2024';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });

    const res = NextResponse.json({ success:true, user: { id:user.id, email:user.email, name:user.name } });
    res.cookies.set('token', token, { httpOnly:true, maxAge: 60*60*24*7, path:'/' });
    return res;
  }catch(e:any){
    console.error('[LOGIN ERROR]', e);
    return NextResponse.json({error:'서버 오류: ' + e.message}, {status:500});
  }
}
