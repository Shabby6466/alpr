import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Allow up to 2GB for test video uploads
    proxyClientMaxBodySize: 2048 * 1024 * 1024,
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
