/**
 * W9 / R10 — sinkron akun (profiles) <-> Data Advokat & Data Paralegal lewat trigger DB.
 * Dilewati bila TEST_DATABASE_URL kosong. Jalankan: `bash tests/integration/run.sh`.
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '@ekasatra/db';

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d('sinkron akun <-> advokat/paralegal (Postgres)', () => {
  const db = (url ? createDb(url) : null) as ReturnType<typeof createDb>;

  async function newUser(name: string, role: string) {
    const id = randomUUID();
    await db.execute(sql`insert into auth.users (id) values (${id})`);
    await db.execute(
      sql`insert into profiles (id, email, full_name, role) values (${id}, ${name + '@sync.id'}, ${name}, ${role}::user_role)`,
    );
    return id;
  }
  async function row(userId: string) {
    const r = await db.execute(
      sql`select full_name, kind, is_active, is_complete, address from advocates where user_id = ${userId}`,
    );
    return (r as unknown as Record<string, unknown>[])[0];
  }

  it('akun Advokat/Paralegal baru → baris otomatis, belum lengkap, tanpa nilai palsu', async () => {
    const a = await newUser('Sinkron Advokat', 'Advokat');
    const p = await newUser('Sinkron Paralegal', 'Paralegal');
    expect(await row(a)).toMatchObject({
      kind: 'Advokat',
      is_active: true,
      is_complete: false,
      address: null,
    });
    expect(await row(p)).toMatchObject({ kind: 'Paralegal', full_name: 'Sinkron Paralegal' });
  });

  it('role Admin tidak membuat baris', async () => {
    const id = await newUser('Sinkron Admin', 'Admin');
    expect(await row(id)).toBeUndefined();
  });

  it('nama sinkron dua arah tanpa rekursi', async () => {
    const id = await newUser('Nama Awal', 'Advokat');
    await db.execute(sql`update profiles set full_name = 'Dari Akun' where id = ${id}`);
    expect(await row(id)).toMatchObject({ full_name: 'Dari Akun' });
    await db.execute(sql`update advocates set full_name = 'Dari Advokat' where user_id = ${id}`);
    const [pr] = (await db.execute(
      sql`select full_name from profiles where id = ${id}`,
    )) as unknown as { full_name: string }[];
    expect(pr?.full_name).toBe('Dari Advokat');
  });

  it('Advokat → Paralegal mengganti kind; keluar role / nonaktif → is_active=false, data tetap', async () => {
    const id = await newUser('Pindah Role', 'Advokat');
    await db.execute(sql`update advocates set phone = '0811', address = 'X', bank_account = '1',
      education = '[{"level":"S1","institution":"UI"}]'::jsonb where user_id = ${id}`);
    expect(await row(id)).toMatchObject({ is_complete: true });

    await db.execute(sql`update profiles set role = 'Paralegal' where id = ${id}`);
    expect(await row(id)).toMatchObject({ kind: 'Paralegal', is_active: true });

    await db.execute(sql`update profiles set role = 'Admin' where id = ${id}`);
    expect(await row(id)).toMatchObject({ is_active: false, address: 'X' });

    await db.execute(sql`update profiles set role = 'Advokat' where id = ${id}`);
    expect(await row(id)).toMatchObject({ kind: 'Advokat', is_active: true });

    await db.execute(sql`update profiles set is_active = false where id = ${id}`);
    expect(await row(id)).toMatchObject({ is_active: false });
  });

  it('hapus akun → baris ditandai nonaktif dan tautan terlepas, baris tidak hilang', async () => {
    const id = await newUser('Akun Dihapus', 'Paralegal');
    await db.execute(sql`delete from auth.users where id = ${id}`);
    const r = (await db.execute(
      sql`select is_active, user_id from advocates where full_name = 'Akun Dihapus'`,
    )) as unknown as { is_active: boolean; user_id: string | null }[];
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ is_active: false, user_id: null });
  });
});
