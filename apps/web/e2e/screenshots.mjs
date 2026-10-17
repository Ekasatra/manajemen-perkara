/**
 * Tangkapan layar 1440px & 390px untuk 5 halaman terpadat (audit jarak tombol).
 * Script terpisah dari Playwright test supaya tidak menambah jumlah tes E2E (harus 6/6).
 * Pakai: dengan server jalan di :3200 (lihat run.sh), `node e2e/screenshots.mjs <outdir>`.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3200';
const OUT = process.argv[2] ?? 'e2e/shots/before';
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'eko.prasetyo@ekasatra.com';
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'e2e-Rahasia-123';

/** 5 halaman terpadat menurut audit gap: tab bar, baris aksi tabel, toolbar, segmented control. */
const STATIC_PAGES = [
  ['surat-keluar', '/surat-keluar'],
  ['jadwal', '/jadwal'],
  ['biaya-perkara', '/invoices'],
];
/** Halaman detail: id diambil dari API daftar agar tidak bergantung pada urutan seed. */
const DETAIL_PAGES = [
  ['detail-perkara', '/api/v1/cases?pageSize=1', 'id', '/cases/'],
  ['detail-klien', '/api/v1/clients?pageSize=1', 'id', '/clients/'],
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });

  // Satu konteks login; URL detail dipetakan lebih dulu di lebar desktop.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));

  const shots = [...STATIC_PAGES];
  for (const [name, api, key, prefix] of DETAIL_PAGES) {
    const res = await page.request.get(`${BASE}${api}`);
    const body = await res.json();
    const id = body?.data?.rows?.[0]?.[key];
    if (id) shots.push([name, `${prefix}${id}`]);
    else console.warn(`lewati ${name}: tidak ada data`);
  }
  await ctx.close();

  for (const [width, height, suffix] of [
    [1440, 900, '1440'],
    [390, 844, '390'],
  ]) {
    const c = await browser.newContext({ viewport: { width, height } });
    const p = await c.newPage();
    for (const [name, url] of shots) {
      await p.goto(`${BASE}${url}`);
      await p.waitForLoadState('networkidle');
      await p.screenshot({ path: `${OUT}/${name}-${suffix}.png`, fullPage: true });
      console.log(`${name}-${suffix}.png`);
    }
    await c.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
