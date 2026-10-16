/**
 * E2E H3. Jangan jalankan langsung: `bash e2e/run.sh` menyiapkan Supabase lokal, seed, dan env.
 * Server memakai build produksi di port terpisah supaya tidak bentrok dengan `next dev` di 3000.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
