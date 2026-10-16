/**
 * H4 — tes keamanan dasar terhadap Postgres sungguhan: akses lintas perkara dan token portal.
 * Dilewati bila TEST_DATABASE_URL kosong. Jalankan: `bash tests/integration/run.sh`.
 * (Validasi tipe/ukuran unggah murni, dites di surat-input.test.ts.)
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '@ekasatra/db';
import {
  addTimelineEntry,
  getCaseDetail,
  getPortalData,
  getVerifiedClientDocument,
  listCases,
  listDocuments,
  type AuthContext,
} from '../../src';

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const ids = {
  advA: randomUUID(),
  advB: randomUUID(),
  clientA: randomUUID(),
  clientB: randomUUID(),
  caseA: randomUUID(),
  caseB: randomUUID(),
  docShared: randomUUID(),
  docInternal: randomUUID(),
};
const tokenA = `tok-a-${randomUUID()}`;
const tokenB = `tok-b-${randomUUID()}`;
const ctx = (id: string, name: string): AuthContext => ({
  userId: id,
  email: `${name}@sec.id`,
  fullName: name,
  role: 'advokat',
  isActive: true,
});
const advA = ctx(ids.advA, 'advA');
const advB = ctx(ids.advB, 'advB');
const page = { page: 1, pageSize: 50, offset: 0 };

d('keamanan (Postgres)', () => {
  const db = (url ? createDb(url) : null) as ReturnType<typeof createDb>;

  beforeAll(async () => {
    for (const [id, name] of [
      [ids.advA, 'advA'],
      [ids.advB, 'advB'],
    ] as const) {
      await db.execute(sql`insert into auth.users (id, email) values (${id}, ${name + '@sec.id'})`);
      await db.execute(
        sql`insert into profiles (id, email, full_name, role) values (${id}, ${name + '@sec.id'}, ${name}, 'Advokat')`,
      );
    }
    await db.execute(sql`insert into clients (id, client_code, name, portal_token) values
      (${ids.clientA}, 'KL-SA', 'Klien A', ${tokenA}), (${ids.clientB}, 'KL-SB', 'Klien B', ${tokenB})`);
    await db.execute(sql`insert into cases (id, reg_no, title, client_id, created_by) values
      (${ids.caseA}, 'REG/2026/8001', 'Perkara A', ${ids.clientA}, ${ids.advA}),
      (${ids.caseB}, 'REG/2026/8002', 'Perkara B', ${ids.clientB}, ${ids.advB})`);
    await db.execute(sql`insert into case_members (case_id, user_id, peran) values
      (${ids.caseA}, ${ids.advA}, 'Advokat'), (${ids.caseB}, ${ids.advB}, 'Advokat')`);
    await db.execute(sql`insert into case_documents (id, case_id, title, file_path, file_name, shared_with_client, uploaded_by) values
      (${ids.docShared}, ${ids.caseB}, 'Putusan', 'cases/b/1/putusan.pdf', 'putusan.pdf', true, ${ids.advB}),
      (${ids.docInternal}, ${ids.caseB}, 'Memo internal', 'cases/b/2/memo.pdf', 'memo.pdf', false, ${ids.advB})`);
    await db.execute(
      sql`insert into settings (key, value) values ('scope_assigned_only', 'true'::jsonb) on conflict (key) do update set value = excluded.value`,
    );
  });

  it('advokat di luar tim: perkara lain tak terlihat di daftar, total tidak bocor', async () => {
    const res = await listCases(db, advA, page);
    expect(res.rows.map((r) => r.id)).toContain(ids.caseA);
    expect(res.rows.map((r) => r.id)).not.toContain(ids.caseB);
    expect(res.total).toBe(res.rows.length);
  });

  it('advokat di luar tim: detail, dokumen, dan tulis timeline perkara lain → NOT_FOUND', async () => {
    const nf = { code: 'NOT_FOUND' };
    await expect(getCaseDetail(db, advA, ids.caseB)).rejects.toMatchObject(nf);
    await expect(listDocuments(db, advA, ids.caseB)).rejects.toMatchObject(nf);
    await expect(
      addTimelineEntry(db, advA, ids.caseB, { eventType: 'Catatan', title: 'x' } as never),
    ).rejects.toMatchObject(nf);
    await expect(listDocuments(db, advB, ids.caseB)).resolves.toHaveLength(2);
  });

  it('portal: token salah dan portal nonaktif memberi galat yang sama', async () => {
    const wrong = await getPortalData(db, 'token-ngawur').catch((e: Error) => e.message);
    await db.execute(sql`update clients set portal_enabled = false where id = ${ids.clientA}`);
    const disabled = await getPortalData(db, tokenA).catch((e: Error) => e.message);
    await db.execute(sql`update clients set portal_enabled = true where id = ${ids.clientA}`);
    expect(typeof wrong).toBe('string');
    expect(disabled).toBe(wrong);
  });

  it('portal: klien hanya melihat perkaranya sendiri', async () => {
    const data = await getPortalData(db, tokenA);
    expect(data.cases.map((c) => c.id)).toEqual([ids.caseA]);
    expect(data.documents).toHaveLength(0);
  });

  it('portal: dokumen klien lain dan dokumen internal tidak bisa diunduh', async () => {
    await expect(getVerifiedClientDocument(db, tokenA, ids.docShared)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(getVerifiedClientDocument(db, tokenB, ids.docInternal)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(getVerifiedClientDocument(db, tokenB, ids.docShared)).resolves.toMatchObject({
      filePath: 'cases/b/1/putusan.pdf',
    });
  });
});
