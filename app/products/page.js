"use client";
import { useEffect, useState } from 'react';
export default function ProductsPage(){
  const [products,setProducts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch('/api/products').then(r=>r.json()).then(d=>{
      if(Array.isArray(d)) setProducts(d);
      else if(d.products) setProducts(d.products);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);
  return (
    <div style={{padding:'20px', maxWidth:'1000px', margin:'0 auto'}}>
      <h1 style={{fontSize:'28px', fontWeight:'bold', marginBottom:'20px'}}>상품 목록</h1>
      {loading? <p>불러오는 중...</p> :
        products.length===0? <div style={{textAlign:'center', padding:'60px', color:'#888'}}><p>등록된 상품이 없습니다.</p><a href="/" style={{color:'#000', textDecoration:'underline'}}>홈으로</a></div> :
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:'16px'}}>
          {products.map((p:any)=>(
            <div key={p.id} style={{border:'1px solid #eee', borderRadius:'12px', padding:'16px'}}>
              <h3 style={{fontWeight:'bold'}}>{p.title || p.name}</h3>
              <p style={{color:'#666', fontSize:'14px', margin:'8px 0'}}>{p.description?.slice(0,60)}...</p>
              <p style={{fontWeight:'bold'}}>{p.price?.toLocaleString()}원</p>
              <a href={`/products/${p.id}`} style={{display:'block', marginTop:'12px', textAlign:'center', padding:'8px', background:'#000', color:'#fff', borderRadius:'8px', textDecoration:'none'}}>상세보기</a>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
