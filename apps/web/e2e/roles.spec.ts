/**
 * W6 — QA per role (SuperAdmin, Admin, Advokat, Paralegal) untuk R1, R3, R4, R6, R7.
 * Jalankan lewat `bash e2e/run.sh` (Supabase lokal + seed:demo + SuperAdmin tjahyo@).
 * R1-link, R2 (SMTP), R5 (unduh) ditandai fixme sampai W4/W1 merge.
 */
import { expect, test, type APIResponse, type Browser, type Page } from '@playwright/test';

const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? '';
const EMAIL = {
  superadmin: 'tjahyo@ekasatra.com',
  admin: 'eko.prasetyo@ekasatra.com',
  advokat: 'advokat@ekasatra.com',
  paralegal: 'paralegal@ekasatra.com',
} as const;
type RoleKey = keyof typeof EMAIL;
const NON_ADMIN: RoleKey[] = ['advokat', 'paralegal'];
const ADMINS: RoleKey[] = ['superadmin', 'admin'];

const sessions = {} as Record<RoleKey, Page>;
const run = Date.now().toString(36);

async function login(browser: Browser, email: string, password = PASSWORD): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  return page;
}

const api = (r: RoleKey) => sessions[r].request;
async function json(res: APIResponse) {
  return (await res.json()) as { ok: boolean; data?: any; error?: { code: string; message: string } };
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  expect(PASSWORD.length, 'SEED_DEMO_PASSWORD wajib (jalankan lewat e2e/run.sh)').toBeGreaterThan(7);
  for (const r of Object.keys(EMAIL) as RoleKey[]) sessions[r] = await login(browser, EMAIL[r]);
});

// ── R7: setiap sel ✘ harus 403 di server (API + halaman), sel ✔ harus lolos ────────────────

const DENIED_API: [string, 'get' | 'post', string, unknown?][] = [
  ['Biaya Perkara', 'get', '/api/v1/invoices'],
  ['Biaya Perkara (buat)', 'post', '/api/v1/invoices', {}],
  ['Manajemen User', 'get', '/api/v1/users'],
  ['Manajemen User (buat)', 'post', '/api/v1/users', {}],
  ['Pengaturan', 'get', '/api/v1/settings'],
  ['Data Advokat (tambah)', 'post', '/api/v1/advocates', {}],
];
const DENIED_PAGES = ['/invoices', '/users', '/settings'];

for (const role of NON_ADMIN) {
  test(`R7 ${role}: semua sel ✘ → 403 (API & halaman)`, async () => {
    for (const [label, method, path, data] of DENIED_API) {
      const res = await api(role)[method](path, method === 'post' ? { data } : undefined);
      expect(res.status(), `${role} ${method} ${path} (${label})`).toBe(403);
    }
    for (const path of DENIED_PAGES) {
      const res = await sessions[role].goto(path);
      expect(res?.status(), `${role} halaman ${path}`).toBe(403);
    }
    const nav = sessions[role].getByRole('navigation').first();
    await sessions[role].goto('/');
    for (const name of [/Biaya Perkara/, /Manajemen User/, /Pengaturan/]) {
      await expect(nav.getByRole('link', { name })).toHaveCount(0);
    }
  });
}

for (const role of ADMINS) {
  test(`R7 ${role}: Biaya Perkara, Manajemen User, Pengaturan tetap terbuka`, async () => {
    for (const path of ['/api/v1/invoices', '/api/v1/users', '/api/v1/settings']) {
      expect((await api(role).get(path)).status(), `${role} ${path}`).toBe(200);
    }
    for (const path of DENIED_PAGES) {
      expect((await sessions[role].goto(path))?.status(), `${role} ${path}`).toBe(200);
    }
  });
}

test('R7 Honor Tim: non-admin hanya honor sendiri, tanpa kas/total biaya (anti-IDOR)', async () => {
  const cases = await json(await api('admin').get('/api/v1/honor-tim?pageSize=5'));
  expect(cases.ok).toBe(true);
  const anyCaseId: string = (cases.data.items ?? cases.data.rows ?? cases.data)[0].caseId ?? (cases.data.items ?? cases.data.rows ?? cases.data)[0].id;
  expect(anyCaseId).toBeTruthy();

  for (const role of NON_ADMIN) {
    // Semua jalur admin Honor Tim (lintas perkara, termasuk perkara milik orang lain) → 403.
    for (const [method, path] of [
      ['get', '/api/v1/honor-tim'],
      ['get', `/api/v1/honor-tim/cases/${anyCaseId}`],
      ['put', `/api/v1/honor-tim/cases/${anyCaseId}`],
      ['post', `/api/v1/honor-tim/cases/${anyCaseId}/publish`],
      ['get', '/api/v1/kas'],
    ] as const) {
      const res = await api(role)[method](path, method === 'get' ? undefined : { data: { items: [] } });
      expect(res.status(), `${role} ${method} ${path}`).toBe(403);
    }
    // Endpoint milik sendiri: tidak memuat total biaya / kas / draft.
    const me = await api(role).get('/api/v1/honor-tim/me');
    expect(me.status()).toBe(200);
    const raw = JSON.stringify((await json(me)).data);
    expect(raw).not.toMatch(/totalBilled|totalAmount|kasPersen|"kas"|draftAmount|fund/);
    // Halaman Honor Tim tidak menampilkan kartu kas/total.
    const page = sessions[role];
    expect((await page.goto('/honor-tim'))?.status()).toBe(200);
    await expect(page.getByText(/total kas|kas kantor|Per Perkara/i)).toHaveCount(0);
  }
});

// ── R6: dialog read-only Data Advokat ──────────────────────────────────────────────────────

for (const role of NON_ADMIN) {
  test(`R6 ${role}: nama membuka dialog read-only; tanpa Tambah/Ubah; Esc menutup`, async () => {
    const page = sessions[role];
    await page.goto('/advocates');
    await expect(page.getByRole('link', { name: /Tambah/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Tambah|Ubah)/ })).toHaveCount(0);
    const trigger = page.locator('button[aria-haspopup="dialog"]').first();
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox')).toHaveCount(0); // read-only
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
}

for (const role of ADMINS) {
  test(`R6 ${role}: boleh tambah data advokat`, async () => {
    await sessions[role].goto('/advocates');
    await expect(sessions[role].getByText(/Tambah/).first()).toBeVisible();
  });
}

// ── R1: reset password manual (bukan link) ─────────────────────────────────────────────────

const NEW_PW = `Baru-${run}-Rahasia!`;
let victimId = '';
const victimEmail = `uji.reset.${run}@ekasatra.com`;

test('R1 manual: Admin membuat user lalu reset; login dengan sandi baru; sandi tidak bocor ke respons/audit', async ({ browser }) => {
  const created = await json(
    await api('admin').post('/api/v1/users', {
      data: { email: victimEmail, fullName: `Uji Reset ${run}`, role: 'Paralegal', password: PASSWORD },
    }),
  );
  expect(created.ok, created.error?.message).toBe(true);
  victimId = created.data.id;

  const short = await api('admin').post(`/api/v1/users/${victimId}/reset-password`, { data: { password: 'pendek' } });
  expect(short.status()).toBeGreaterThanOrEqual(400);
  expect(short.status()).toBeLessThan(500);

  const res = await api('admin').post(`/api/v1/users/${victimId}/reset-password`, { data: { password: NEW_PW } });
  expect(res.status()).toBe(200);
  expect(await res.text()).not.toContain(NEW_PW);

  const ctx = await browser.newContext();
  const bad = await ctx.request.post('/api/v1/auth/login', { data: { email: victimEmail, password: PASSWORD } });
  expect(bad.ok()).toBe(false);
  const page = await login(browser, victimEmail, NEW_PW);
  await expect(page).toHaveURL(/\/$/);

  // Audit Log mencatat tindakan tanpa sandi (lama maupun baru).
  const audit = await (await api('superadmin').get('/api/v1/audit?pageSize=50')).text();
  expect(audit).toContain('reset_password');
  expect(audit).not.toContain(NEW_PW);
  expect(audit).not.toContain(PASSWORD);
});

test('R1: yang boleh reset hanya Admin/SuperAdmin; Admin tidak boleh reset SuperAdmin', async () => {
  const users = await json(await api('superadmin').get('/api/v1/users?pageSize=100'));
  const rows: { id: string; email: string }[] = users.data.rows;
  const superId = rows.find((u) => u.email === EMAIL.superadmin)!.id;
  const adminId = rows.find((u) => u.email === EMAIL.admin)!.id;
  for (const role of NON_ADMIN) {
    const r = await api(role).post(`/api/v1/users/${victimId}/reset-password`, { data: { password: NEW_PW } });
    expect(r.status(), `${role} reset`).toBe(403);
  }
  const bySuperAttempt = await api('admin').post(`/api/v1/users/${superId}/reset-password`, { data: { password: NEW_PW } });
  expect(bySuperAttempt.status()).toBe(403);
  // SuperAdmin boleh mereset Admin; (sandi dikembalikan agar akun demo tetap bisa dipakai)
  const ok = await api('superadmin').post(`/api/v1/users/${adminId}/reset-password`, { data: { password: PASSWORD } });
  expect(ok.status()).toBe(200);
});

test.fixme('R1 link: token sekali pakai, kedaluwarsa ≤ 1 jam, hanya ke email terdaftar (menunggu merge W4)', () => {});
test.fixme('R2 email: notifikasi memicu email SMTP, kegagalan tak menggagalkan transaksi (menunggu W4 + env SMTP)', () => {});
test.fixme('R5 unduh: surat keluar demo dapat diunduh, tombol disabled bila tanpa berkas (menunggu W1)', () => {});

// ── R3: klien multi-kontak ─────────────────────────────────────────────────────────────────

const phone = (value: string, isPrimary = false) => ({ kind: 'phone', value, isPrimary });
const email = (value: string, isPrimary = false) => ({ kind: 'email', value, isPrimary });
const newClient = (role: RoleKey, contacts: unknown[]) =>
  api(role).post('/api/v1/clients', { data: { name: `Klien R3 ${run} ${Math.random()}`, contacts } });

test('R3: Admin/SuperAdmin menyimpan banyak kontak; Advokat/Paralegal ditolak', async () => {
  for (const role of ADMINS) {
    const res = await json(
      await newClient(role, [phone('0812-3456-7890', true), phone('021 555 0100'), email('a@klien.example', true), email('b@klien.example')]),
    );
    expect(res.ok, `${role}: ${res.error?.message}`).toBe(true);
    const detail = await json(await api(role).get(`/api/v1/clients/${res.data.id}`));
    expect(detail.ok).toBe(true);
    expect(JSON.stringify(detail.data)).toContain('b@klien.example');
  }
  for (const role of NON_ADMIN) {
    expect((await newClient(role, [phone('0812-3456-7890', true)])).status()).toBe(403);
  }
});

test('R3: validasi — email/telepon salah, duplikat, 2 primary, tanpa primary, >10 per jenis', async () => {
  const bad: [string, unknown[]][] = [
    ['email salah', [email('bukan-email', true)]],
    ['telepon salah', [phone('abc', true)]],
    ['duplikat', [phone('0812345678', true), phone('0812345678')]],
    ['dua primary', [phone('0812345678', true), phone('0899999999', true)]],
    ['tanpa primary', [phone('0812345678'), phone('0899999999')]],
    ['11 telepon', Array.from({ length: 11 }, (_, i) => phone(`08123456${String(i).padStart(2, '0')}`, i === 0))],
  ];
  for (const [label, contacts] of bad) {
    const res = await newClient('admin', contacts);
    expect(res.status(), label).toBe(400);
  }
});

// ── R4: status invoice diturunkan dari pembayaran + PDF ────────────────────────────────────

test('R4: Belum Bayar → Sebagian → Lunas; PDF tersedia; Advokat/Paralegal ditolak', async () => {
  const client = await json(await newClient('admin', []));
  const kase = await json(
    await api('admin').post('/api/v1/cases', { data: { title: `Perkara R4 ${run}`, clientId: client.data.id } }),
  );
  expect(kase.ok, kase.error?.message).toBe(true);
  for (const role of ADMINS) {
    const inv = await json(
      await api(role).post('/api/v1/invoices', { data: { caseId: kase.data.id, amount: 10_000_000, description: `R4 ${role}` } }),
    );
    expect(inv.ok, inv.error?.message).toBe(true);
    expect(inv.data.status).toBe('Belum Bayar');
    const part = await json(await api(role).post(`/api/v1/invoices/${inv.data.id}/payments`, { data: { amount: 4_000_000 } }));
    expect(part.data.status).toBe('Sudah Bayar Sebagian');
    const full = await json(await api(role).post(`/api/v1/invoices/${inv.data.id}/payments`, { data: { amount: 6_000_000 } }));
    expect(full.data.status).toBe('Lunas');
    const pdf = await api(role).get(`/api/v1/invoices/${inv.data.id}/pdf?type=invoice`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
    for (const nr of NON_ADMIN) {
      expect((await api(nr).get(`/api/v1/invoices/${inv.data.id}`)).status()).toBe(403);
      expect((await api(nr).get(`/api/v1/invoices/${inv.data.id}/pdf?type=invoice`)).status()).toBe(403);
      expect((await api(nr).post(`/api/v1/invoices/${inv.data.id}/payments`, { data: { amount: 1000 } })).status()).toBe(403);
    }
  }
});

test('Hanya SuperAdmin boleh menghapus (Admin 403)', async () => {
  const c = await json(await newClient('admin', []));
  expect((await api('admin').delete(`/api/v1/clients/${c.data.id}`)).status()).toBe(403);
  expect((await api('superadmin').delete(`/api/v1/clients/${c.data.id}`)).status()).toBe(200);
});
