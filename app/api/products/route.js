import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';
export async function GET(){
  try{
    const products = await prisma.product.findMany({ orderBy:{ createdAt:'desc' }, take: 50 }).catch(()=>[]);
    return NextResponse.json(products);
  }catch(e){
    console.error(e);
    return NextResponse.json([]);
  }
}
