/**
 * Integrasi modul surat terhadap Postgres sungguhan (Agent E).
 * Dilewati bila TEST_DATABASE_URL kosong. Jalankan: `bash tests/integration/run.sh`
 * (Postgres 17 throwaway di Docker, migrasi dari nol). Storage di-mock.
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/surat/storage', async (orig) => ({
  ...(await orig<typeof import('../../src/surat/storage')>()),
  assertUploaded: async () => undefined,
  removeFile: async () => undefined,
  signedDownloadUrl: async () => 'https://signed.example/x',
}));

import { createDb } from '@ekasatra/db';
import type { AuthContext } from '../../src';
import {
  applySuratAction,
  createSuratKeluar,
  createSuratMasuk,
  createTemplate,
  getSuratKeluar,
  listSuratKeluar,
  listSuratMasuk,
  updateSuratMasuk,
  type NotifyInput,
  type SuratDeps,
  tempCaseLookup,
} from '../../src/surat';

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const ids = {
  admin: randomUUID(),
  adv: randomUUID(),
  para: randomUUID(),
  other: randomUUID(),
  client: randomUUID(),
  caseId: randomUUID(),
};
const ctx = (id: string, role: string, name: string): AuthContext => ({
  userId: id,
  email: `${name}@x.id`,
  fullName: name,
  role: role.toLowerCase() as AuthContext['role'],
  isActive: true,
});
const admin = ctx(ids.admin, 'admin', 'Admin');
const adv = ctx(ids.adv, 'advokat', 'Advokat A');
const para = ctx(ids.para, 'paralegal', 'Paralegal P');
const other = ctx(ids.other, 'advokat', 'Advokat B');

const sent: NotifyInput[] = [];
const deps: SuratDeps = {
  cases: tempCaseLookup,
  notifier: { notify: async (n) => void sent.push(n) },
};

d('modul surat (Postgres)', () => {
  // describe.skip tetap menjalankan callback; buat koneksi hanya saat env ada.
  const db = (url ? createDb(url) : null) as ReturnType<typeof createDb>;

  beforeAll(async () => {
    const mk = async (id: string, role: string, name: string, at: string) => {
      await db.execute(sql`insert into auth.users (id, email) values (${id}, ${name + '@x.id'})`);
      await db.execute(
        sql`insert into profiles (id, email, full_name, role, created_at) values (${id}, ${name + '@x.id'}, ${name}, ${role}::user_role, ${at}::timestamptz)`,
      );
    };
    await mk(ids.admin, 'Admin', 'admin', '2026-01-01');
    await mk(ids.adv, 'Advokat', 'advokatA', '2026-01-02');
    await mk(ids.para, 'Paralegal', 'paralegalP', '2026-01-03');
    await mk(ids.other, 'Advokat', 'advokatB', '2026-01-04');
    await db.execute(sql`insert into clients (id, client_code, name) values (${ids.client}, 'KL-T1', 'Klien Uji')`);
    await db.execute(
      sql`insert into cases (id, reg_no, title, client_id, created_by) values (${ids.caseId}, 'REG/2026/9001', 'Perkara Uji', ${ids.client}, ${ids.adv})`,
    );
    await db.execute(
      sql`insert into case_members (case_id, user_id, peran) values (${ids.caseId}, ${ids.adv}, 'Advokat'), (${ids.caseId}, ${ids.para}, 'Paralegal')`,
    );
    await db.execute(
      sql`insert into settings (key, value) values ('scope_assigned_only', 'true'::jsonb), ('pimpinan_user_id', '""'::jsonb) on conflict (key) do update set value = excluded.value`,
    );
  });

  const base = {
    tglSurat: '2026-10-15',
    kepada: 'PN Jakarta',
    perihal: 'Permohonan',
    filePath: `keluar/${ids.para}/x/surat.pdf`,
  };

  it('alur Perkara penuh: Draft → (review dilewati) → Siap_TTD → Ditandatangani → Terkirim', async () => {
    const s = await createSuratKeluar(
      db,
      para,
      { ...base, noSurat: 'A-001/EKS', jenis: 'Perkara', caseId: ids.caseId },
      deps,
    );
    expect(s.status).toBe('Draft');

    // nomor unik case-insensitive
    await expect(
      createSuratKeluar(db, para, { ...base, noSurat: 'a-001/eks', jenis: 'Instansi' }, deps),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const submitted = await applySuratAction(db, para, s.id, 'Submit', {}, deps);
    expect(submitted).toMatchObject({ status: 'Siap_TTD', reviewerId: ids.adv, signerId: ids.adv });

    await expect(applySuratAction(db, para, s.id, 'Sign', {}, deps)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(applySuratAction(db, admin, s.id, 'Sign', {}, deps)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect((await applySuratAction(db, adv, s.id, 'Sign', {}, deps)).status).toBe('Ditandatangani');

    const sentRow = await applySuratAction(db, para, s.id, 'Send', { sendToEmail: 'a@b.id' }, deps);
    expect(sentRow.status).toBe('Terkirim');

    const detail = await getSuratKeluar(db, para, s.id, deps);
    expect(detail.logs.map((l) => l.action)).toEqual(['Submit', 'Sign', 'Send']);
    const tl = await db.execute(
      sql`select count(*)::int as n from case_timeline where case_id = ${ids.caseId} and event_type = 'Surat'`,
    );
    expect((tl as unknown as { n: number }[])[0]!.n).toBe(1);
    expect(sent.some((n) => n.toEmails?.includes('a@b.id'))).toBe(true);
  });

  it('Instansi: review → reject wajib catatan → Draft; signer = Admin pertama', async () => {
    const s = await createSuratKeluar(
      db,
      para,
      { ...base, noSurat: 'B-002/EKS', jenis: 'Instansi', reviewerId: ids.adv },
      deps,
    );
    const r = await applySuratAction(db, para, s.id, 'Submit', {}, deps);
    expect(r).toMatchObject({ status: 'Review', reviewerId: ids.adv, signerId: ids.admin });
    expect((await applySuratAction(db, adv, s.id, 'Approve', {}, deps)).status).toBe('Siap_TTD');
    await expect(
      applySuratAction(db, admin, s.id, 'Reject', { note: ' ' }, deps),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    const back = await applySuratAction(db, admin, s.id, 'Reject', { note: 'perbaiki' }, deps);
    expect(back.status).toBe('Draft');
  });

  it('visibilitas: advokat di luar tim tidak melihat surat Perkara', async () => {
    const list = await listSuratKeluar(db, other, { page: { pageSize: 50, offset: 0 } }, deps);
    expect(list.rows.find((r) => r.noSurat === 'A-001/EKS')).toBeUndefined();
    const s = (await listSuratKeluar(db, admin, { page: { pageSize: 50, offset: 0 } }, deps)).rows[0]!;
    await expect(getSuratKeluar(db, other, s.id, deps)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('surat masuk: SM/{tahun}/{0001} berurutan, disposisi otomatis + email', async () => {
    const a = await createSuratMasuk(db, para, { sender: 'PT X', subject: 'Somasi', sifat: 'Biasa' }, deps);
    const b = await createSuratMasuk(
      db,
      para,
      { sender: 'PT Y', subject: 'Panggilan', sifat: 'Segera', assignedTo: ids.adv },
      deps,
    );
    const no = (r: { noAgenda: string }) => Number(r.noAgenda.split('/')[2]);
    expect(no(b)).toBe(no(a) + 1);
    expect(a.status).toBe('Belum');
    expect(b.status).toBe('Didisposisi');
    expect(sent.some((n) => n.preference === 'email_disposisi' && n.toUserIds[0] === ids.adv)).toBe(true);

    const upd = await updateSuratMasuk(db, adv, a.id, { assignedTo: ids.adv }, deps);
    expect(upd.status).toBe('Didisposisi');
    const mine = await listSuratMasuk(db, adv, { mine: true, page: { pageSize: 50, offset: 0 } }, deps);
    expect(mine.total).toBeGreaterThanOrEqual(2);
  });

  it('template: hanya Admin yang mengunggah', async () => {
    const t = { name: 'Somasi', category: 'Umum', filePath: `tpl/${ids.admin}/x/t.docx` };
    await expect(createTemplate(db, para, t)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const ok = await createTemplate(db, admin, t);
    expect(ok.category).toBe('Umum');
  });
});
