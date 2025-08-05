/** @type {import('next').NextConfig} */
const nextConfig = {
  // 実験的機能でサーバーコンポーネントの最適化
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  // Prisma用のWebpackとSWC設定
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prismaクライアントの最適化
      config.externals.push('@prisma/client')
    }
    return config
  },
  swcMinify: false, // Prisma互換性のためSWCminifyを無効化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      // CSP設定を一時的に無効化（デバッグ用）
      ...(false ? [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: data:",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob: https:",
                "font-src 'self' data:",
                "connect-src 'self' https:",
                "worker-src 'self' blob:",
                "child-src 'self' blob:",
                "frame-ancestors 'none'",
                "object-src 'none'",
                "base-uri 'self'"
              ].join('; ') + ';'
            }
          ]
        }
      ] : [])
    ]
  }
}

module.exports = nextConfig