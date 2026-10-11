// 카카오 로그인 (OAuth 2.0). Render 환경변수: KAKAO_REST_API_KEY (필수), KAKAO_CLIENT_SECRET (카카오 콘솔에서 켠 경우)
function kakaoEnabled() {
  return !!process.env.KAKAO_REST_API_KEY;
}

function buildAuthUrl({ redirectUri, state }) {
  const p = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });
  return `https://kauth.kakao.com/oauth/authorize?${p.toString()}`;
}

async function exchangeCode({ code, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: redirectUri,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) return { error: data.error_description || '카카오 인증에 실패했어요.' };
  return { accessToken: data.access_token };
}

// 카카오 사용자 정보를 우리 앱에서 쓰는 모양으로 정리
function normalizeProfile(raw) {
  const acc = (raw && raw.kakao_account) || {};
  const nickname = (acc.profile && acc.profile.nickname) || (raw && raw.properties && raw.properties.nickname) || '';
  const hasValidEmail = !!acc.email && acc.is_email_valid !== false;
  return {
    kakaoId: raw && raw.id != null ? String(raw.id) : null,
    nickname: String(nickname).trim().slice(0, 30),
    email: hasValidEmail ? String(acc.email).trim().toLowerCase() : null,
    emailVerified: hasValidEmail && acc.is_email_verified === true,
  };
}

async function fetchProfile(accessToken) {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: '카카오 사용자 정보를 가져오지 못했어요.' };
  const profile = normalizeProfile(data);
  if (!profile.kakaoId) return { error: '카카오 사용자 정보가 올바르지 않아요.' };
  return { profile };
}

module.exports = { kakaoEnabled, buildAuthUrl, exchangeCode, fetchProfile, normalizeProfile };
