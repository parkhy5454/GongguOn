"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function SignupPage(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState(''); const [loading,setLoading]=useState(false);
  const router=useRouter();
  const submit=async(e:any)=>{
    e.preventDefault(); setLoading(true);
    try{
      const res=await fetch('/api/auth/signup',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password,name})});
      const data=await res.json();
      if(res.ok){ alert('회원가입 성공! 로그인해주세요'); router.push('/login'); }
      else alert(data.error||'회원가입 실패');
    }catch{ alert('서버 오류'); } setLoading(false);
  };
  return (
    <div style={{minHeight:'80vh', display:'flex', justifyContent:'center', alignItems:'center', padding:'20px'}}>
      <form onSubmit={submit} style={{width:'100%', maxWidth:'400px', border:'1px solid #eee', padding:'30px', borderRadius:'12px'}}>
        <h1 style={{fontSize:'24px', fontWeight:'bold', marginBottom:'20px'}}>회원가입</h1>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="이름" style={{width:'100%', padding:'12px', marginBottom:'12px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" style={{width:'100%', padding:'12px', marginBottom:'12px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" style={{width:'100%', padding:'12px', marginBottom:'20px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <button disabled={loading} style={{width:'100%', padding:'12px', background:'#000', color:'#fff', borderRadius:'8px', border:'none'}}>{loading?'가입 중...':'회원가입'}</button>
        <p style={{marginTop:'16px', textAlign:'center', fontSize:'14px'}}><a href="/login" style={{color:'#666'}}>이미 계정이 있나요? 로그인</a></p>
      </form>
    </div>
  );
}
