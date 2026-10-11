/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' }, // 클릭재킹(우리 사이트를 iframe에 몰래 삽입) 방지
          { key: 'X-Content-Type-Options', value: 'nosniff' }, // 브라우저가 파일 타입을 멋대로 추측하는 것 방지
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }, // HTTPS만 쓰도록 브라우저에 지시
        ],
      },
    ];
  },
};
module.exports = nextConfig;
