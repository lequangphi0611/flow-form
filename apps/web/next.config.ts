import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@flowform/types', '@flowform/validators'],
}

export default nextConfig
