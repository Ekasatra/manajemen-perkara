import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ekasatra/shared', '@ekasatra/core', '@ekasatra/db'],
  // W2.2 (R7): guard halaman memakai `forbidden()` → halaman "Tidak punya akses" (403).
  experimental: { authInterrupts: true },
};

export default nextConfig;
