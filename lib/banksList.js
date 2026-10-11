// 토스페이먼츠(금융결제원) 은행 코드 — 브라우저/서버 공용 (암호화 코드와 분리)
const BANKS = [
  { code: '06', name: '국민은행' }, { code: '88', name: '신한은행' }, { code: '20', name: '우리은행' },
  { code: '81', name: '하나은행' }, { code: '11', name: '농협은행' }, { code: '03', name: '기업은행' },
  { code: '90', name: '카카오뱅크' }, { code: '92', name: '토스뱅크' }, { code: '89', name: '케이뱅크' },
  { code: '23', name: 'SC제일은행' }, { code: '27', name: '씨티은행' }, { code: '02', name: '산업은행' },
  { code: '07', name: '수협은행' }, { code: '31', name: '대구은행' }, { code: '32', name: '부산은행' },
  { code: '34', name: '광주은행' }, { code: '35', name: '제주은행' }, { code: '37', name: '전북은행' },
  { code: '39', name: '경남은행' }, { code: '45', name: '새마을금고' }, { code: '48', name: '신협' },
  { code: '71', name: '우체국' },
];

module.exports = { BANKS };
