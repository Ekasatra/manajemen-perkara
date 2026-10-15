/**
 * Integrasi keuangan (invoice, honor, kas) terhadap Postgres sungguhan (migrasi B). Hanya jalan bila TEST_DATABASE_URL diset:
 *   docker run -d --rm --name ekasatra-f-int -p 127.0.0.1:55432:5432 -e POSTGRES_PASSWORD=pw postgres:17
 *   (bootstrap.sql + migrations/*.sql dari supabase/ dijalankan berurutan)
 *   TEST_DATABASE_URL=postgres://postgres:pw@127.0.0.1:55432/postgres pnpm --filter @ekasatra/core test
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '@ekasatra/db';
import type { AuthContext } from '../../src/kernel/auth';
import {
  getHonorOverview,
  getKasSummary,
  listHonorCases,
  listMyHonor,
  publishHonor,
  saveHonorDraft,
  setHonorPaid,
} from '../../src/honor-tim';
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  listInvoicesForReport,
  markPaid,
  outstandingSummary,
  recordPayment,
  updateInvoice,
} from '../../src/invoices';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('invoices — Postgres', () => {
  const db = createDb(url ?? 'postgres://unused');
  const ids = {
    admin: crypto.randomUUID(),
    advokat: crypto.randomUUID(),
    client: crypto.randomUUID(),
    otherClient: crypto.randomUUID(),
    case: crypto.randomUUID(),
  };
  const admin: AuthContext = {
    userId: ids.admin,
    email: 'admin@test.local',
    fullName: 'Admin Uji',
    role: 'admin',
    isActive: true,
  };
  const advokat: AuthContext = { ...admin, userId: ids.advokat, role: 'advokat' };

  beforeAll(async () => {
    await db.execute(sql`insert into auth.users (id, email) values
      (${ids.admin}, 'admin@test.local'), (${ids.advokat}, 'adv@test.local')`);
    await db.execute(sql`insert into profiles (id, email, full_name, role) values
      (${ids.admin}, 'admin@test.local', 'Admin Uji', 'Admin'),
      (${ids.advokat}, 'adv@test.local', 'Advokat Uji', 'Advokat')`);
    await db.execute(sql`insert into clients (id, client_code, name) values
      (${ids.client}, 'KL-T001', 'Klien Uji'), (${ids.otherClient}, 'KL-T002', 'Klien Lain')`);
    await db.execute(sql`insert into cases (id, reg_no, title, client_id) values
      (${ids.case}, 'REG/T/0001', 'Perkara Uji', ${ids.client})`);
  });

  afterAll(async () => {
    await db.execute(sql`delete from invoices`);
    await db.execute(sql`delete from cases where id = ${ids.case}`);
    await db.execute(sql`delete from clients where id in (${ids.client}, ${ids.otherClient})`);
    await db.execute(sql`delete from profiles where id in (${ids.admin}, ${ids.advokat})`);
    await db.execute(sql`delete from auth.users where id in (${ids.admin}, ${ids.advokat})`);
  });

  it('penomoran INV/{tahun}/{0001} berurutan dan klien diturunkan dari perkara', async () => {
    const a = await createInvoice(db, admin, { caseId: ids.case, amount: 1_000_000 });
    const b = await createInvoice(db, admin, { clientId: ids.client, amount: 500_000 });
    const year = new Date().getFullYear();
    expect(a.invoiceNo).toMatch(new RegExp(`^INV/(${year}|${year + 1})/\\d{4}$`));
    const seq = (n: string) => Number(n.split('/')[2]);
    expect(seq(b.invoiceNo)).toBe(seq(a.invoiceNo) + 1);
    expect(a.clientId).toBe(ids.client);
    expect(a.status).toBe('Belum Bayar');
  });

  it('klien tidak cocok dengan klien perkara ditolak', async () => {
    await expect(
      createInvoice(db, admin, { caseId: ids.case, clientId: ids.otherClient, amount: 1000 }),
    ).rejects.toThrow(/tidak sesuai/);
  });

  it('non-Admin tidak bisa membuat/melihat invoice', async () => {
    await expect(
      createInvoice(db, advokat, { clientId: ids.client, amount: 1000 }),
    ).rejects.toThrow(/Akses ditolak/);
    await expect(listInvoices(db, advokat, { page: 1, pageSize: 20 })).rejects.toThrow(/Akses/);
  });

  it('cicilan → Sebagian → pelunasan → Lunas dengan paid_date', async () => {
    const inv = await createInvoice(db, admin, { caseId: ids.case, amount: 1_000_000 });
    const p1 = await recordPayment(db, admin, inv.id, { amount: 400_000, paidDate: '2026-10-01' });
    expect(p1.status).toBe('Sebagian');
    expect(p1.paidDate).toBeNull();
    const p2 = await recordPayment(db, admin, inv.id, { amount: 600_000, paidDate: '2026-10-15' });
    expect(p2.status).toBe('Lunas');
    expect(p2.paidAmount).toBe(1_000_000);
    expect(p2.paidDate).toBe('2026-10-15');
  });

  it('pembayaran paralel tidak kehilangan update (FOR UPDATE)', async () => {
    const inv = await createInvoice(db, admin, { caseId: ids.case, amount: 100_000 });
    await Promise.all(
      Array.from({ length: 10 }, () => recordPayment(db, admin, inv.id, { amount: 1_000 })),
    );
    expect((await getInvoice(db, admin, inv.id)).paidAmount).toBe(10_000);
  });

  it('tandai lunas menyetel paid_amount = amount', async () => {
    const inv = await createInvoice(db, admin, { caseId: ids.case, amount: 750_000 });
    await recordPayment(db, admin, inv.id, { amount: 250_000 });
    const done = await markPaid(db, admin, inv.id, { paidDate: '2026-10-20' });
    expect(done.paidAmount).toBe(750_000);
    expect(done.status).toBe('Lunas');
    expect(done.paidDate).toBe('2026-10-20');
  });

  it('mengubah jumlah invoice Lunas menurunkannya ke Sebagian', async () => {
    const inv = await createInvoice(db, admin, { caseId: ids.case, amount: 100_000 });
    await markPaid(db, admin, inv.id);
    const up = await updateInvoice(db, admin, inv.id, { amount: 150_000 });
    expect(up.status).toBe('Sebagian');
    expect(up.paidDate).toBeNull();
  });

  it('invoice yang sudah dibayar tidak bisa dihapus; yang belum bisa', async () => {
    const paid = await createInvoice(db, admin, { caseId: ids.case, amount: 10_000 });
    await recordPayment(db, admin, paid.id, { amount: 1 });
    await expect(deleteInvoice(db, admin, paid.id)).rejects.toThrow(/tidak dapat dihapus/);
    const unpaid = await createInvoice(db, admin, { caseId: ids.case, amount: 10_000 });
    await deleteInvoice(db, admin, unpaid.id);
    await expect(getInvoice(db, admin, unpaid.id)).rejects.toThrow(/tidak ditemukan/);
  });

  it('DB menolak menulis status langsung (generated column)', async () => {
    const inv = await createInvoice(db, admin, { caseId: ids.case, amount: 10_000 });
    await expect(
      db.execute(sql`update invoices set status = 'Lunas' where id = ${inv.id}`),
    ).rejects.toThrow();
  });

  it('F6: laporan & ringkasan piutang konsisten dengan data', async () => {
    await db.execute(sql`delete from invoices`);
    const a = await createInvoice(db, admin, {
      caseId: ids.case,
      amount: 1_000,
      invoiceDate: '2026-09-01',
      dueDate: '2026-09-30',
    });
    const b = await createInvoice(db, admin, {
      caseId: ids.case,
      amount: 2_000,
      invoiceDate: '2026-10-01',
      dueDate: '2026-10-20',
    });
    await recordPayment(db, admin, b.id, { amount: 500 });
    const c = await createInvoice(db, admin, { clientId: ids.client, amount: 4_000 });
    await markPaid(db, admin, c.id);

    const s = await outstandingSummary(db, admin, { today: '2026-10-15', dueInDays: 14 });
    expect(s.invoiceCount).toBe(3);
    expect(s.totalAmount).toBe(7_000);
    expect(s.totalPaid).toBe(4_500);
    expect(s.outstanding).toBe(2_500); // 1.000 + 1.500
    expect(s.byStatus).toEqual({ 'Belum Bayar': 1, Sebagian: 1, Lunas: 1 });
    expect(s.overdue).toEqual({ count: 1, outstanding: 1_000 });
    expect(s.dueSoon.map((d) => d.invoiceNo)).toEqual([b.invoiceNo]);
    expect(s.dueSoon[0]?.outstanding).toBe(1_500);

    const rep = await listInvoicesForReport(db, admin, { from: '2026-10-01', status: 'Sebagian' });
    expect(rep.map((r) => r.id)).toEqual([b.id]);
    expect(rep[0]?.clientName).toBe('Klien Uji');
    expect(rep[0]?.caseRegNo).toBe('REG/T/0001');
    expect(a.id).not.toBe(b.id);
  });
});

describe.skipIf(!url)('honor tim & kas — Postgres', () => {
  const db = createDb(url ?? 'postgres://unused');
  const id = () => crypto.randomUUID();
  const ids = { admin: id(), a1: id(), a2: id(), client: id(), kase: id() };
  const ctx = (userId: string, role: AuthContext['role'], fullName: string): AuthContext => ({
    userId,
    email: `${fullName}@test.local`,
    fullName,
    role,
    isActive: true,
  });
  const admin = ctx(ids.admin, 'admin', 'Admin');
  const a1 = ctx(ids.a1, 'advokat', 'Advokat Satu');
  const a2 = ctx(ids.a2, 'paralegal', 'Paralegal Dua');

  const setSetting = (key: string, value: unknown) =>
    db.execute(sql`insert into settings (key, value) values (${key}, ${JSON.stringify(value)}::jsonb)
      on conflict (key) do update set value = excluded.value`);

  beforeAll(async () => {
    await db.execute(sql`insert into auth.users (id, email) values
      (${ids.admin}, 'h-admin@test.local'), (${ids.a1}, 'h-a1@test.local'), (${ids.a2}, 'h-a2@test.local')`);
    await db.execute(sql`insert into profiles (id, email, full_name, role) values
      (${ids.admin}, 'h-admin@test.local', 'Admin', 'Admin'),
      (${ids.a1}, 'h-a1@test.local', 'Advokat Satu', 'Advokat'),
      (${ids.a2}, 'h-a2@test.local', 'Paralegal Dua', 'Paralegal')`);
    await db.execute(
      sql`insert into clients (id, client_code, name) values (${ids.client}, 'KL-H001', 'Klien Honor')`,
    );
    await db.execute(
      sql`insert into cases (id, reg_no, title, client_id) values (${ids.kase}, 'REG/H/0001', 'Perkara Honor', ${ids.client})`,
    );
    // a1 punya dua peran (Advokat + Manager) → harus dihitung satu anggota.
    await db.execute(sql`insert into case_members (case_id, user_id, peran) values
      (${ids.kase}, ${ids.a1}, 'Advokat'), (${ids.kase}, ${ids.a1}, 'Manager'), (${ids.kase}, ${ids.a2}, 'Paralegal')`);
    await setSetting('kas_kantor_persen', 12.5);
    await setSetting('kas_viewers', []);
    // Total tagihan 1.005 → kas 12,5% = 125,625 → 126; dana distribusi 879.
    await createInvoice(db, admin, { caseId: ids.kase, amount: 600 });
    await createInvoice(db, admin, { caseId: ids.kase, amount: 405 });
  });

  afterAll(async () => {
    await db.execute(sql`delete from honor_tim`);
    await db.execute(sql`delete from invoices`);
    await db.execute(sql`delete from cases where id = ${ids.kase}`);
    await db.execute(sql`delete from clients where id = ${ids.client}`);
    await db.execute(sql`delete from profiles where id in (${ids.admin}, ${ids.a1}, ${ids.a2})`);
    await db.execute(sql`delete from auth.users where id in (${ids.admin}, ${ids.a1}, ${ids.a2})`);
    await db.execute(sql`delete from settings where key in ('kas_kantor_persen', 'kas_viewers')`);
  });

  it('ringkasan: kas dibulatkan half-up, dana = total − kas, anggota ganda peran satu baris', async () => {
    const o = await getHonorOverview(db, admin, ids.kase);
    expect(o.totalBilled).toBe(1005);
    expect(o.kas).toBe(126);
    expect(o.fund).toBe(879);
    expect(o.kas + o.fund).toBe(o.totalBilled);
    expect(o.state).toBe('Draft');
    expect(o.members.map((m) => m.userId).sort()).toEqual([ids.a1, ids.a2].sort());
    expect(o.members.every((m) => m.draftAmount === null)).toBe(true);
  });

  it('publish ditolak bila ada anggota belum terisi', async () => {
    await saveHonorDraft(db, admin, ids.kase, [{ userId: ids.a1, amount: 500 }]);
    await expect(publishHonor(db, admin, ids.kase)).rejects.toThrow(/Paralegal Dua.*belum diisi/);
  });

  it('publish ditolak bila total > dana (selisih 1 rupiah), lolos bila tepat sama', async () => {
    await saveHonorDraft(db, admin, ids.kase, [
      { userId: ids.a1, amount: 500 },
      { userId: ids.a2, amount: 380 },
    ]);
    await expect(publishHonor(db, admin, ids.kase)).rejects.toThrow(/melebihi dana distribusi 879/);

    await saveHonorDraft(db, admin, ids.kase, [{ userId: ids.a2, amount: 379 }]);
    const res = await publishHonor(db, admin, ids.kase);
    expect(res.total).toBe(879);
    expect(res.changedUserIds.sort()).toEqual([ids.a1, ids.a2].sort());
    expect((await getHonorOverview(db, admin, ids.kase)).state).toBe('Terdistribusi');
  });

  it('anggota hanya melihat nilai published; draft baru tidak bocor', async () => {
    await saveHonorDraft(db, admin, ids.kase, [
      { userId: ids.a1, amount: 400 },
      { userId: ids.a2, amount: 379 },
    ]);
    const mine = await listMyHonor(db, a1);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.amount).toBe(500);
    expect(JSON.stringify(mine)).not.toContain('400');
    expect(Object.keys(mine[0] ?? {})).not.toContain('draftAmount');
    expect((await getHonorOverview(db, admin, ids.kase)).state).toBe('Berubah');
  });

  it('non-Admin tidak bisa mengelola honor', async () => {
    await expect(saveHonorDraft(db, a1, ids.kase, [{ userId: ids.a1, amount: 1 }])).rejects.toThrow(
      /Akses ditolak/,
    );
    await expect(publishHonor(db, a1, ids.kase)).rejects.toThrow(/Akses ditolak/);
    await expect(getHonorOverview(db, a2, ids.kase)).rejects.toThrow(/Akses ditolak/);
    await expect(listHonorCases(db, a1)).rejects.toThrow(/Akses ditolak/);
  });

  it('honor Dibayar tidak bisa diubah sampai status dibatalkan', async () => {
    await publishHonor(db, admin, ids.kase); // 400 + 379 = 779 ≤ 879
    await setHonorPaid(db, admin, ids.kase, ids.a1, true);
    await expect(
      saveHonorDraft(db, admin, ids.kase, [{ userId: ids.a1, amount: 450 }]),
    ).rejects.toThrow(/sudah Dibayar/);
    const mine = await listMyHonor(db, a1);
    expect(mine[0]).toMatchObject({ amount: 400, status: 'Dibayar' });
    await setHonorPaid(db, admin, ids.kase, ids.a1, false);
    await saveHonorDraft(db, admin, ids.kase, [{ userId: ids.a1, amount: 450 }]);
  });

  it('tidak bisa menandai Dibayar sebelum didistribusikan', async () => {
    await db.execute(sql`update honor_tim set published_amount = null, published_at = null`);
    await expect(setHonorPaid(db, admin, ids.kase, ids.a2, true)).rejects.toThrow(
      /belum didistribusikan/,
    );
    await publishHonor(db, admin, ids.kase);
  });

  it('kas: hanya Admin dan kas_viewers', async () => {
    await expect(getKasSummary(db, a2)).rejects.toThrow(/tidak berhak/);
    const asAdmin = await getKasSummary(db, admin);
    expect(asAdmin).toMatchObject({
      kasPersen: 12.5,
      totalBilled: 1005,
      totalKas: 126,
      totalFund: 879,
    });
    expect(asAdmin.distributed).toBe(450 + 379);

    await setSetting('kas_viewers', [ids.a2]);
    expect((await getKasSummary(db, a2)).totalKas).toBe(126);
    await expect(getKasSummary(db, a1)).rejects.toThrow(/tidak berhak/);
  });

  it('turun dana (invoice dikurangi) setelah publish → state Berubah', async () => {
    await db.execute(sql`update invoices set amount = 405 where amount = 600`); // total 810 → kas 101,25→101, dana 709
    const o = await getHonorOverview(db, admin, ids.kase);
    expect(o.fund).toBe(709);
    expect(o.publishedTotal).toBe(829);
    expect(o.state).toBe('Berubah');
    await expect(publishHonor(db, admin, ids.kase)).rejects.toThrow(/melebihi dana/);
  });

  it('anggota keluar tim: barisnya dibuang saat publish bila belum dibayar', async () => {
    await db.execute(sql`update invoices set amount = 600 where amount = 405 and invoice_no in (
      select invoice_no from invoices order by invoice_no limit 1)`);
    await db.execute(sql`delete from case_members where user_id = ${ids.a2}`);
    await saveHonorDraft(db, admin, ids.kase, [{ userId: ids.a1, amount: 450 }]);
    expect((await getHonorOverview(db, admin, ids.kase)).state).toBe('Berubah');
    await publishHonor(db, admin, ids.kase);
    const left = await db.execute(sql`select user_id from honor_tim where case_id = ${ids.kase}`);
    expect(left.map((r) => r.user_id)).toEqual([ids.a1]);
  });

  it('daftar perkara honor memuat state & kas per perkara', async () => {
    const list = await listHonorCases(db, admin);
    const item = list.items.find((i) => i.case.id === ids.kase);
    expect(item?.state).toBe('Terdistribusi');
    expect(item?.kas).toBeGreaterThan(0);
  });
});
