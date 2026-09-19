const crypto = require('crypto');

function signParams(params, apiSecret) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
}

// buffer: Buffer, filename: 원본 파일명(확장자 추론용)
async function uploadToCloudinary(buffer, folder = 'gonggu-on') {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { error: 'Cloudinary 환경변수(CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)가 설정되지 않았어요.' };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = signParams(params, apiSecret);

  const form = new FormData();
  form.append('file', new Blob([buffer]));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Cloudinary 업로드 실패: ${text.slice(0, 200)}` };
  }

  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}

module.exports = { uploadToCloudinary };
