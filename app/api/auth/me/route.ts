import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
const prisma = new PrismaClient();
export const dynamic='force-dynamic';
export async function GET(req){
  try{
    const token = req.cookies.get('token')?.value;
    if(!token) return NextResponse.json({user:null});
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'gongguon-dev-secret-2024';
    const decoded:any = jwt.verify(token, secret);
    const user = await prisma.user.findUnique({ where:{ id: decoded.id } });
    return NextResponse.json({user: user ? { id:user.id, email:user.email, name:user.name } : null});
  }catch(e){ return NextResponse.json({user:null}); }
}
