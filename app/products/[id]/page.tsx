"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
export default function ProductDetail(){
  const params=useParams(); const id=params?.id as string;
  const [product,setProduct]=useState<any>(null);
  useEffect(()=>{ if(id) fetch(`/api/products/${id}`).then(r=>r.json()).then(setProduct); },[id]);
  if(!product) return <div style={{padding:'40px'}}>불러오는 중...</div>;
  return (
    <div style={{padding:'20px', maxWidth:'800px', margin:'0 auto'}}>
      <a href="/products" style={{color:'#666'}}>← 목록으로</a>
      <h1 style={{fontSize:'28px', fontWeight:'bold', marginTop:'16px'}}>{product.title || product.name}</h1>
      <p style={{marginTop:'16px', lineHeight:'1.6'}}>{product.description}</p>
      <p style={{marginTop:'20px', fontSize:'24px', fontWeight:'bold'}}>{product.price?.toLocaleString()}원</p>
      <button style={{marginTop:'20px', padding:'12px 24px', background:'#000', color:'#fff', borderRadius:'8px', border:'none', width:'100%'}}>공동구매 참여하기</button>
    </div>
  );
}
