import type { NextConfig } from 'next'

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  Date.now().toString()

const nextConfig: NextConfig = {
  env: {
    // Inlined into the client bundle so PwaRegister can bust SW cache per deploy
    NEXT_PUBLIC_SW_CACHE_VERSION: buildId,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
}

export default nextConfig
