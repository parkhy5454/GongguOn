"use client";
import { useState } from 'react';
export default function ResetPage(){
  const [email,setEmail]=useState('parkhy5454@gmail.com');
  const [pw,setPw]=useState('');
  const [msg,setMsg]=useState('');
  const submit=async(e:any)=>{
    e.preventDefault();
    const res=await fetch('/api/auth/reset',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password:pw})});
    const data=await res.json();
    setMsg(data.success ? '✅ 비밀번호가 변경되었습니다! /login으로 가서 로그인하세요' : '❌ '+data.error);
  };
  return (
    <div style={{minHeight:'80vh', display:'flex', justifyContent:'center', alignItems:'center', padding:'20px'}}>
      <form onSubmit={submit} style={{width:'100%', maxWidth:'400px', border:'1px solid #eee', padding:'30px', borderRadius:'12px'}}>
        <h1 style={{fontSize:'22px', fontWeight:'bold', marginBottom:'20px'}}>비밀번호 재설정</h1>
        <p style={{fontSize:'13px', color:'#666', marginBottom:'16px'}}>기존 계정의 비번을 새로 바꿉니다. 이 페이지는 임시로 쓰는 겁니다.</p>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" style={{width:'100%', padding:'12px', marginBottom:'12px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="새 비밀번호 (6자 이상)" style={{width:'100%', padding:'12px', marginBottom:'20px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <button style={{width:'100%', padding:'12px', background:'#000', color:'#fff', borderRadius:'8px', border:'none'}}>비밀번호 변경</button>
        {msg && <p style={{marginTop:'16px', padding:'12px', background:'#f5f5f5', borderRadius:'8px', fontSize:'14px'}}>{msg}</p>}
        <p style={{marginTop:'16px', textAlign:'center'}}><a href="/login" style={{color:'#000'}}>로그인하러 가기</a></p>
      </form>
    </div>
  );
}
