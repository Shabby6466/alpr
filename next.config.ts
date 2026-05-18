import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    middlewareClientMaxBodySize: 50 * 1024 * 1024, // 50MB
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3006/api/:path*',
      },
    ]
  },
}

export default nextConfig
