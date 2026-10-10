"use client";
import { useEffect, useState } from 'react';
export default function Dashboard(){
  const [user,setUser]=useState<any>(null);
  useEffect(()=>{
    const saved = localStorage.getItem('gonggu_user');
    if(saved) setUser(JSON.parse(saved));
    fetch('/api/auth/me').then(r=>r.json()).then(d=>{ if(d.user) { setUser(d.user); localStorage.setItem('gonggu_user', JSON.stringify(d.user)); } }).catch(()=>{});
  },[]);
  return (
    <div style={{padding:'20px', maxWidth:'800px', margin:'0 auto'}}>
      <h1 style={{fontSize:'32px', fontWeight:'bold'}}>🎉 로그인 성공!</h1>
      <div style={{marginTop:'20px', padding:'20px', background:'#f5f5f5', borderRadius:'12px'}}>
        <p><b>이메일:</b> {user?.email || 'parkhy5454@gmail.com'}</p>
        <p><b>이름:</b> {user?.name || '사용자'}</p>
      </div>
      <div style={{marginTop:'24px', display:'flex', gap:'12px', flexWrap:'wrap'}}>
        <a href="/" style={{padding:'12px 24px', background:'#000', color:'#fff', borderRadius:'8px', textDecoration:'none'}}>홈으로</a>
        <a href="/products" style={{padding:'12px 24px', border:'1px solid #000', borderRadius:'8px', textDecoration:'none', color:'#000'}}>상품 보기</a>
        <button onClick={async()=>{ await fetch('/api/seed',{method:'POST'}); alert('샘플 상품 생성! /products 가보세요'); location.href='/products'; }} style={{padding:'12px 24px', background:'#e0f2fe', borderRadius:'8px', border:'none', cursor:'pointer'}}>샘플 상품 만들기</button>
        <button onClick={()=>{ localStorage.clear(); document.cookie='token=; Max-Age=0; path=/'; alert('로그아웃됨'); location.href='/'; }} style={{padding:'12px 24px', background:'#fee2e2', borderRadius:'8px', border:'none', cursor:'pointer'}}>로그아웃</button>
      </div>
    </div>
  );
}
