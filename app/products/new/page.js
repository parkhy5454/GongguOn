"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function NewProductPage(){
  const [title,setTitle]=useState('');
  const [desc,setDesc]=useState('');
  const [price,setPrice]=useState('');
  const [loading,setLoading]=useState(false);
  const router=useRouter();
  const submit=async(e:any)=>{
    e.preventDefault(); setLoading(true);
    try{
      const res=await fetch('/api/products',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title, description:desc, price: parseInt(price)||0})});
      const data=await res.json();
      if(res.ok){ alert('상품 등록 성공!'); router.push('/products'); }
      else alert('실패: '+(data.error||'')); 
    }catch{ alert('서버 오류'); }
    setLoading(false);
  };
  return (
    <div style={{padding:'20px', maxWidth:'600px', margin:'0 auto'}}>
      <h1 style={{fontSize:'24px', fontWeight:'bold', marginBottom:'20px'}}>상품 등록하기 (로그인 없이 가능)</h1>
      <form onSubmit={submit} style={{display:'flex', flexDirection:'column', gap:'12px'}}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="상품 제목 (예: 스타벅스 텀블러 공동구매)" required style={{padding:'12px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="상품 설명" required style={{padding:'12px', border:'1px solid #ddd', borderRadius:'8px', minHeight:'100px'}}/>
        <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="가격 (원)" required style={{padding:'12px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <button disabled={loading} style={{padding:'12px', background:'#000', color:'#fff', borderRadius:'8px', border:'none'}}>{loading?'등록 중...':'등록하기'}</button>
      </form>
      <div style={{marginTop:'20px', display:'flex', gap:'12px'}}>
        <a href="/products" style={{color:'#666'}}>← 상품 목록</a>
        <a href="/" style={{color:'#666', marginLeft:'12px'}}>홈으로</a>
      </div>
    </div>
  );
}
