/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              // Fallback: only self by default; specific directives below override this
              "default-src 'self'",
              // Scripts: self + inline/eval (Next.js requires these) + payment and OAuth SDKs
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.tosspayments.com accounts.google.com kauth.kakao.com kapi.kakao.com",
              // Styles: self + inline (Tailwind / CSS-in-JS) + Pretendard font CDN
              "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
              // API / WebSocket connections
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co api.anthropic.com api.tosspayments.com js.tosspayments.com accounts.google.com *.googleapis.com kauth.kakao.com kapi.kakao.com",
              // Images: any HTTPS source, plus data URIs and blob URLs (user uploads / avatars)
              "img-src 'self' data: blob: https:",
              // Fonts: self, data URIs, and Pretendard CDN
              "font-src 'self' data: cdn.jsdelivr.net",
              // iFrames: Toss Payments and Google / Kakao OAuth popups
              "frame-src js.tosspayments.com accounts.google.com kauth.kakao.com",
              // Form submissions only go to self or OAuth endpoints
              "form-action 'self' accounts.google.com kauth.kakao.com",
              // Disallow plugins (Flash, etc.)
              "object-src 'none'",
              // Allow service workers from self only
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
