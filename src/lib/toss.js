async function confirmTossPayment({ paymentKey, orderId, amount }) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return { error: 'TOSS_SECRET_KEY 환경변수가 설정되지 않았어요.' };
  }

  const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');

  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.message || '결제 승인에 실패했습니다.' };
  }
  return { payment: data };
}

module.exports = { confirmTossPayment };
