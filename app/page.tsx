"use client";
export default function Home() {
  return (
    <div style={{minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'system-ui', padding:'20px'}}>
      <h1 style={{fontSize:'48px', marginBottom:'10px'}}>🎉 GongguOn</h1>
      <p style={{fontSize:'18px', color:'#666', marginBottom:'30px'}}>배포 성공! 공동구매 플랫폼 정상 작동중</p>
      <div style={{display:'flex', gap:'12px'}}>
        <a href="/products" style={{padding:'12px 24px', background:'#000', color:'#fff', borderRadius:'8px', textDecoration:'none'}}>상품 보기</a>
        <a href="/login" style={{padding:'12px 24px', border:'1px solid #000', borderRadius:'8px', textDecoration:'none', color:'#000'}}>로그인</a>
      </div>
    </div>
  );
}
