import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Performance optimizations
  reactStrictMode: true,

  // Production optimizations
  compress: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
