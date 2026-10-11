// 폰으로 찍은 큰 사진을 업로드 전에 줄여서(긴 변 1600px, JPEG) 업로드 시간과 데이터 사용량을 아낌.
// 줄일 수 없거나(GIF, 브라우저 미지원, HEIC 등) 이미 작으면 원본 그대로 반환.
export async function compressImage(file, { maxSize = 1600, quality = 0.82, skipBelow = 350 * 1024 } = {}) {
  try {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
    if (file.size < skipBelow) return file;
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); // 폰 사진의 회전 정보 반영
    const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * ratio));
    const h = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // 투명 PNG가 검게 나오지 않도록 흰 배경
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (e) {
    return file;
  }
}
