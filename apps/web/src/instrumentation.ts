/**
 * Instrumentation hook Next.js — dijalankan saat server start (Node.js runtime).
 * W4.2: daftarkan `after()` dari `next/server` sebagai background scheduler
 * untuk pengiriman email notifikasi, agar tidak memblokir respons/transaksi
 * di Vercel serverless (PRD §4 R2 · K2).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { after } = await import('next/server');
    const { setBackgroundScheduler } = await import('@ekasatra/core');
    setBackgroundScheduler((task) => {
      after(async () => {
        try {
          await task();
        } catch (err) {
          console.error('[instrumentation] background email task gagal:', err);
        }
      });
    });
  }
}
