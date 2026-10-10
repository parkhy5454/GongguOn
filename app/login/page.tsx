"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function LoginPage(){
  const [email,setEmail]=useState('parkhy5454@gmail.com');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const router=useRouter();
  const submit=async(e:any)=>{
    e.preventDefault(); setLoading(true);
    try{
      const res=await fetch('/api/auth/login',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})});
      const data=await res.json();
      if(res.ok){
        localStorage.setItem('gonggu_user', JSON.stringify(data.user));
        alert('로그인 성공! 대시보드로 이동');
        router.push('/dashboard');
      } else alert(data.error || '로그인 실패');
    }catch(err){ alert('서버 오류'); } setLoading(false);
  };
  return (
    <div style={{minHeight:'80vh', display:'flex', justifyContent:'center', alignItems:'center', padding:'20px'}}>
      <form onSubmit={submit} style={{width:'100%', maxWidth:'400px', border:'1px solid #eee', padding:'30px', borderRadius:'12px'}}>
        <h1 style={{fontSize:'24px', fontWeight:'bold', marginBottom:'20px'}}>로그인</h1>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일" style={{width:'100%', padding:'12px', marginBottom:'12px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" style={{width:'100%', padding:'12px', marginBottom:'20px', border:'1px solid #ddd', borderRadius:'8px'}}/>
        <button disabled={loading} style={{width:'100%', padding:'12px', background:'#000', color:'#fff', borderRadius:'8px', border:'none'}}>{loading?'로그인 중...':'로그인'}</button>
      </form>
    </div>
  );
}
