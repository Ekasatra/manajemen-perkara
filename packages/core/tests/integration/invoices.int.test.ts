/**
 * Integrasi invoice terhadap Postgres sungguhan (migrasi B). Hanya jalan bila TEST_DATABASE_URL diset:
 *   docker run -d --rm --name ekasatra-f-int -p 127.0.0.1:55432:5432 -e POSTGRES_PASSWORD=pw postgres:17
 *   (bootstrap.sql + migrations/*.sql dari supabase/ dijalankan berurutan)
 *   TEST_DATABASE_URL=postgres://postgres:pw@127.0.0.1:55432/postgres pnpm --filter @ekasatra/core test
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '@ekasatra/db';
import type { AuthContext } from '../../src/kernel/auth';
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
