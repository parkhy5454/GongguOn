// Next.js가 처리 중 예상치 못한 오류(500)가 날 때마다 호출해주는 훅입니다.
export async function onRequestError(err, request, context) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { reportError } = await import('./lib/alert');
    await reportError(err, request, context);
  } catch (e) {
    // 알림 실패가 서비스에 영향을 주면 안 됨
  }
}
