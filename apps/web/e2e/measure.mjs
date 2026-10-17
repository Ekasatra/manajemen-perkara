/**
 * Audit jarak objektif: semua pasangan tombol sebaris/segenggam dalam satu induk dan semua
 * kendali berukuran kecil, diukur dari render sungguhan. Dipakai untuk tabel sebelum/sesudah.
 * Pakai: server jalan di :3200, `node e2e/measure.mjs <outfile.json>`.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3200';
const OUT = process.argv[2] ?? 'e2e/shots/before/measure.json';
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'eko.prasetyo@ekasatra.com';
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'e2e-Rahasia-123';

const STATIC_PAGES = [
  ['surat-keluar', '/surat-keluar'],
  ['jadwal', '/jadwal'],
  ['biaya-perkara', '/invoices'],
  ['pengguna', '/users'],
  ['advokat', '/advocates'],
];
const DETAIL_PAGES = [
  ['detail-perkara', '/api/v1/cases?pageSize=1', '/cases/'],
  ['detail-klien', '/api/v1/clients?pageSize=1', '/clients/'],
];

/** Diukur di dalam page. */
const AUDIT = `() => {
  const isBtnLike = (el) => {
    const tag = el.tagName;
    if (tag === 'BUTTON') return true;
    if (tag === 'A' && el.hasAttribute('href')) {
      const c = el.className;
      return /min-h-|rounded-control|rounded-lg|rounded-full|inline-flex/.test(c);
    }
    return el.getAttribute('role') === 'button';
  };
  const desc = (el) => {
    const t = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30);
    const lbl = el.getAttribute('aria-label');
    return el.tagName.toLowerCase() + (lbl ? '[' + lbl + ']' : t ? '{' + t + '}' : '');
  };
  const rect = (el) => el.getBoundingClientRect();

  const pairs = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('button, a[href], [role=button]')) {
    if (!isBtnLike(el) || rect(el).width === 0) continue;
    const p = el.parentElement;
    if (!p) continue;
    const kids = [...p.children].filter((k) => isBtnLike(k) && rect(k).width > 0);
    if (kids.length < 2) continue;
    const i = kids.indexOf(el);
    if (i < 0 || i >= kids.length - 1) continue;
    const a = el;
    const b = kids[i + 1];
    const ra = rect(a);
    const rb = rect(b);
    let gap = null;
    if (Math.abs(rb.top - ra.top) < 4 && rb.left >= ra.right - 1) {
      gap = Math.round((rb.left - ra.right) * 10) / 10;
    } else if (Math.abs(rb.left - ra.left) < 4 && rb.top >= ra.bottom - 1) {
      gap = Math.round((rb.top - ra.bottom) * 10) / 10;
    }
    if (gap === null) continue;
    const key = desc(a) + '|' + desc(b) + '|' + gap;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({
      gap,
      a: desc(a),
      b: desc(b),
      parent: String(p.className).slice(0, 70),
      // Baris tabel = jarak seragam 8–12px (area sentuh 40–44px), bukan 12px penuh.
      inTable: Boolean(p.closest('td, th')),
    });
  }

  const small = [];
  for (const el of document.querySelectorAll('button, a[href], [role=button]')) {
    if (!isBtnLike(el)) continue;
    const r = rect(el);
    if (r.width === 0) continue;
    const iconOnly = !(el.textContent || '').replace(/\\s+/g, '').length;
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    const tooSmall = iconOnly ? w < 40 || h < 40 : h < 37;
    if (tooSmall) {
      small.push({ el: desc(el), w, h, iconOnly, cls: String(el.className).slice(0, 80) });
    }
  }
  return { pairs, small };
}`;

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  const report = {};
  await page.setViewportSize({ width: 1440, height: 900 });
  report['login-1440'] = await page.evaluate(`(${AUDIT})()`);
  await page.setViewportSize({ width: 390, height: 844 });
  report['login-390'] = await page.evaluate(`(${AUDIT})()`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((u) => u.pathname === '/');

  const targets = [...STATIC_PAGES];
  for (const [name, api, prefix] of DETAIL_PAGES) {
    const res = await page.request.get(`${BASE}${api}`);
    const body = await res.json();
    const id = body?.data?.rows?.[0]?.id;
    if (id) targets.push([name, `${prefix}${id}`]);
  }

  for (const [width, suffix] of [
    [1440, '1440'],
    [390, '390'],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, url] of targets) {
      await page.goto(`${BASE}${url}`);
      await page.waitForLoadState('networkidle');
      report[`${name}-${suffix}`] = await page.evaluate(`(${AUDIT})()`);
    }
  }

  await browser.close();
  await writeFile(OUT, JSON.stringify(report, null, 2));

  // Ringkas di stdout: pelanggaran saja (jarak < 8 ikon / < 12 teks).
  let bad = 0;
  let smallCount = 0;
  for (const [pageKey, { pairs, small }] of Object.entries(report)) {
    for (const p of pairs) {
      const iconPair = !p.a.includes('{') && !p.b.includes('{');
      // Ambang: ikon-ikon 8px; baris tabel 8px; pasangan teks lain 12px.
      const min = iconPair || p.inTable ? 8 : 12;
      if (p.gap < min) {
        console.log(`GAP ${pageKey} ${p.gap}px < ${min}: ${p.a} || ${p.b}`);
        bad++;
      }
    }
    for (const s of small) {
      console.log(`SIZE ${pageKey} ${s.w}x${s.h}${s.iconOnly ? ' ikon' : ''}: ${s.el}`);
      smallCount++;
    }
  }
  console.log(`\nTotal pasangan melanggar: ${bad}; kendali kecil: ${smallCount}; file: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
