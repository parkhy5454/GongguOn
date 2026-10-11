const { encrypt, decrypt } = require('./secretBox');

const { BANKS } = require('./banksList');

function bankName(code) {
  const b = BANKS.find((x) => x.code === String(code));
  return b ? b.name : code ? `은행(${code})` : '';
}

// 환불 계좌 입력값 검사. 문제가 있으면 오류 문장을, 정상이면 정리된 객체를 반환
function validateRefundAccount(input) {
  if (!input || typeof input !== 'object') return { error: '환불 받을 계좌 정보를 입력해주세요.' };
  const bank = String(input.bank || '');
  const accountNumber = String(input.accountNumber || '').replace(/[^0-9]/g, '');
  const holderName = String(input.holderName || '').trim();
  if (!BANKS.some((b) => b.code === bank)) return { error: '은행을 선택해주세요.' };
  if (accountNumber.length < 8 || accountNumber.length > 20) return { error: '계좌번호를 숫자만 정확히 입력해주세요.' };
  if (holderName.length < 2 || holderName.length > 20) return { error: '예금주명을 정확히 입력해주세요.' };
  return { account: { bank, accountNumber, holderName } };
}

function encryptAccount(account) {
  return encrypt(JSON.stringify(account));
}
function decryptAccount(enc) {
  if (!enc) return null;
  const plain = decrypt(enc);
  if (!plain) return null;
  try { return JSON.parse(plain); } catch (e) { return null; }
}

module.exports = { BANKS, bankName, validateRefundAccount, encryptAccount, decryptAccount };
