// 사업자 정보 표시 (Render 환경변수에 값을 넣으면 약관/방침 하단에 자동으로 나타나요. 비어 있는 항목은 숨겨집니다.)
//  BIZ_NAME 상호 / BIZ_OWNER 대표자 / BIZ_REG_NO 사업자등록번호 / BIZ_MAILORDER_NO 통신판매업 신고번호
//  BIZ_ADDRESS 주소 / CONTACT_EMAIL 문의·개인정보 보호책임자 이메일 / PRIVACY_OFFICER 개인정보 보호책임자 이름
export function getBiz() {
  const e = process.env;
  return {
    name: e.BIZ_NAME, owner: e.BIZ_OWNER, regNo: e.BIZ_REG_NO, mailOrderNo: e.BIZ_MAILORDER_NO,
    address: e.BIZ_ADDRESS, email: e.CONTACT_EMAIL, officer: e.PRIVACY_OFFICER,
  };
}

export default function BizInfo() {
  const b = getBiz();
  const rows = [
    ['상호', b.name], ['대표자', b.owner], ['사업자등록번호', b.regNo],
    ['통신판매업 신고번호', b.mailOrderNo], ['주소', b.address], ['문의 이메일', b.email],
  ].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <p style={{ color: 'var(--text-dim)', fontSize: 12.5, marginTop: 24, lineHeight: 1.7 }}>
      {rows.map(([k, v]) => (<span key={k}>{k}: {v}<br /></span>))}
    </p>
  );
}
