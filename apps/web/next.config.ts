import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev lokal via 127.0.0.1 (Playwright/verifikasi visual) diizinkan lewat HMR.
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: ['@ekasatra/shared', '@ekasatra/core', '@ekasatra/db'],
  // W2.2 (R7): guard halaman memakai `forbidden()` → halaman "Tidak punya akses" (403).
  experimental: { authInterrupts: true },
};

export default nextConfig;
