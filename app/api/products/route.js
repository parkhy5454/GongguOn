import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const dynamic='force-dynamic';

export async function GET(){
  try{
    const products = await prisma.product.findMany({ orderBy:{ createdAt:'desc' }, take: 50 });
    return NextResponse.json(products);
  }catch(e){ return NextResponse.json([]); }
}

export async function POST(req){
  try{
    const body = await req.json();
    console.log('[CREATE PRODUCT]', body);
    const { title, description, price } = body;
    if(!title) return NextResponse.json({error:'제목 필요'}, {status:400});
    
    let product;
    try{
      product = await prisma.product.create({ data:{ title, description: description||'', price: parseInt(price)||0, status:'OPEN' } as any });
    }catch(e1:any){
      console.log('create with status failed', e1.message);
      try{
        product = await prisma.product.create({ data:{ title, description: description||'', price: parseInt(price)||0 } as any });
      }catch(e2:any){
        // raw insert
        const id = 'prod_' + Math.random().toString(36).substring(2,9);
        await prisma.$executeRawUnsafe(`INSERT INTO "Product" (id, title, description, price, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())`, id, title, description||'', parseInt(price)||0);
        product = { id, title, description, price };
      }
    }
    return NextResponse.json(product);
  }catch(e:any){
    console.error('[CREATE ERROR]', e);
    return NextResponse.json({error:e.message},{status:500});
  }
}
