/**
 * H3 — alur utama lewat server sungguhan (Supabase lokal + seed:demo).
 * Login lewat form UI; mutasi lewat API dengan cookie sesi yang sama (lebih tahan perubahan
 * tampilan), lalu hasilnya dicek di halaman.
 */
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? '';
const ADMIN = 'eko.prasetyo@ekasatra.com';
const ADVOKAT = 'advokat@ekasatra.com';
const PARALEGAL = 'paralegal@ekasatra.com';

type Session = { page: Page; api: APIRequestContext };

async function login(browser: Browser, email: string): Promise<Session> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  return { page, api: page.request };
}

/** Panggil API dan kembalikan `data`; gagal keras bila `ok: false`. */
async function call<T>(
  s: Session,
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  data?: unknown,
): Promise<T> {
  const res = await s.api.fetch(`/api/v1${path}`, { method, data });
  const body = (await res.json()) as { ok: boolean; data?: T; error?: { message: string } };
  expect(body.ok, `${method} ${path}: ${body.error?.message}`).toBe(true);
  return body.data as T;
}

test.describe.configure({ mode: 'serial' });

let admin: Session;
let advokat: Session;
let paralegal: Session;
const run = Date.now().toString(36);
const state: { clientId?: string; token?: string; caseId?: string; caseTitle?: string } = {};

test.beforeAll(async ({ browser }) => {
  expect(PASSWORD.length, 'SEED_DEMO_PASSWORD wajib (jalankan lewat e2e/run.sh)').toBeGreaterThan(7);
  admin = await login(browser, ADMIN);
  advokat = await login(browser, ADVOKAT);
  paralegal = await login(browser, PARALEGAL);
});

test('login 3 role: menu mengikuti hak akses', async () => {
  const nav = (s: Session) => s.page.getByRole('navigation').first();
  await expect(nav(admin).getByRole('link', { name: /Biaya Perkara/ })).toBeVisible();
  await expect(nav(advokat).getByRole('link', { name: /Perkara/ }).first()).toBeVisible();
  await expect(nav(advokat).getByRole('link', { name: /Biaya Perkara/ })).toHaveCount(0);
  await expect(nav(paralegal).getByRole('link', { name: /Audit/ })).toHaveCount(0);
  // API menolak di luar matriks, bukan hanya menyembunyikan menu.
  const res = await paralegal.api.get('/api/v1/invoices');
  expect(res.status()).toBe(403);
});

test('buat perkara: advokat membuat, otomatis anggota tim, paralegal ditambahkan Admin', async () => {
  const client = await call<{ id: string; portalToken: string }>(admin, 'POST', '/clients', {
    name: `Klien E2E ${run}`,
  });
  state.clientId = client.id;
  state.token = client.portalToken;
  state.caseTitle = `Perkara E2E ${run}`;

  const kase = await call<{ id: string; regNo: string }>(advokat, 'POST', '/cases', {
    title: state.caseTitle,
    clientId: client.id,
  });
  state.caseId = kase.id;
  expect(kase.regNo).toMatch(/^REG\/\d{4}\//);

  const users = await call<{ rows: { id: string; email: string }[] }>(admin, 'GET', '/users?pageSize=100');
  const dewi = users.rows.find((u) => u.email === PARALEGAL);
  expect(dewi).toBeDefined();
  await call(admin, 'POST', `/cases/${kase.id}/members`, { userId: dewi!.id, peran: 'Paralegal' });

  await paralegal.page.goto(`/cases/${kase.id}`);
  await expect(paralegal.page.getByText(state.caseTitle).first()).toBeVisible();
});

test('alur surat penuh: Draft → Siap TTD → Ditandatangani → Terkirim', async () => {
  const pdf = Buffer.from('%PDF-1.4\n% e2e\n');
  const target = await call<{ path: string; fileName: string; signedUrl: string }>(
    paralegal,
    'POST',
    '/surat-keluar/upload-url',
    { fileName: 'surat-e2e.pdf', size: pdf.length },
  );
  const put = await paralegal.api.put(target.signedUrl, {
    data: pdf,
    headers: { 'content-type': 'application/pdf' },
  });
  expect(put.ok(), await put.text()).toBe(true);

  const surat = await call<{ id: string; status: string }>(paralegal, 'POST', '/surat-keluar', {
    noSurat: `E2E-${run}/EKS`,
    tglSurat: new Date().toISOString().slice(0, 10),
    kepada: 'PN Jakarta Selatan',
    perihal: 'Permohonan salinan putusan',
    jenis: 'Perkara',
    caseId: state.caseId,
    filePath: target.path,
    fileName: target.fileName,
  });
  expect(surat.status).toBe('Draft');

  const submitted = await call<{ status: string }>(paralegal, 'POST', `/surat-keluar/${surat.id}/submit`, {});
  expect(submitted.status).toBe('Siap_TTD');
  const denied = await admin.api.post(`/api/v1/surat-keluar/${surat.id}/sign`, { data: {} });
  expect(denied.status()).toBe(403);
  const signed = await call<{ status: string }>(advokat, 'POST', `/surat-keluar/${surat.id}/sign`, {});
  expect(signed.status).toBe('Ditandatangani');
  const sent = await call<{ status: string }>(paralegal, 'POST', `/surat-keluar/${surat.id}/send`, {
    sendToEmail: 'pn-jaksel@example.com',
  });
  expect(sent.status).toBe('Terkirim');

  await paralegal.page.goto(`/surat-keluar/${surat.id}`);
  await expect(paralegal.page.getByText('Terkirim').first()).toBeVisible();
});

test('invoice lunas: buat, tandai lunas, status Lunas', async () => {
  const inv = await call<{ id: string; status: string }>(admin, 'POST', '/invoices', {
    caseId: state.caseId,
    amount: 10_000_000,
    description: 'Jasa hukum tahap 1',
  });
  expect(inv.status).toBe('Belum Bayar');
  const paid = await call<{ status: string; paidDate: string | null }>(
    admin,
    'POST',
    `/invoices/${inv.id}/mark-paid`,
    {},
  );
  expect(paid.status).toBe('Lunas');
  expect(paid.paidDate).not.toBeNull();
});

test('publish honor: Admin distribusi, anggota melihat nilainya', async () => {
  const o = await call<{ fund: number; members: { userId: string }[] }>(
    admin,
    'GET',
    `/honor-tim/cases/${state.caseId}`,
  );
  expect(o.members).toHaveLength(2);
  expect(o.fund).toBeGreaterThan(0);
  const each = Math.floor(o.fund / 2);
  await call(admin, 'PUT', `/honor-tim/cases/${state.caseId}`, {
    items: o.members.map((m) => ({ userId: m.userId, amount: each })),
  });
  const pub = await call<{ state: string; changedUserIds: string[] }>(
    admin,
    'POST',
    `/honor-tim/cases/${state.caseId}/publish`,
  );
  expect(pub.state).toBe('Terdistribusi');
  expect(pub.changedUserIds).toHaveLength(2);

  const mine = await call<{ caseId: string; amount: number }[]>(advokat, 'GET', '/honor-tim/me');
  expect(mine.find((h) => h.caseId === state.caseId)?.amount).toBe(each);
});

test('portal klien: token benar hanya melihat perkaranya, token salah ditolak', async ({ page }) => {
  await page.goto(`/portal/${state.token}`);
  await expect(page.getByText(state.caseTitle!).first()).toBeVisible();
  await expect(page.getByText('REG/2026/9001')).toHaveCount(0);

  const wrong = await page.request.get('/api/v1/portal/token-salah');
  expect(wrong.status()).toBe(404);
});
