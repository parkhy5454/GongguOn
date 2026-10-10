import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const dynamic='force-dynamic';
export async function POST(){
  try{
    const samples = [
      { title:'공동구매 - 스타벅스 텀블러', description:'스타벅스 텀블러 공동구매 10명 모이면 50% 할인', price:15000 },
      { title:'공동구매 - 배달 음식', description:'치킨 공동구매, 3명이서 주문하면 배달비 무료', price:20000 },
      { title:'공동구매 - 과일 박스', description:'제주 감귤 5kg 공동구매', price:25000 },
    ];
    for(const s of samples){
      try{ await prisma.product.create({ data:{ ...s, status:'OPEN' } as any }); }catch(e){ 
        try{ await prisma.product.create({ data:{ title:s.title, description:s.description, price:s.price } as any }); }catch{}
      }
    }
    return NextResponse.json({success:true});
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500}); }
}
