import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ekasatra/shared', '@ekasatra/core', '@ekasatra/db'],
};

export default nextConfig;
