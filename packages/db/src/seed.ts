/**
 * Seed minimal (idempoten): settings default + 1 Admin + (opsional) 1 Superadmin.
 *   DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (≥ 8), [SEED_ADMIN_NAME]
 *   [SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD, SEED_SUPERADMIN_NAME]
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (untuk membuat user di Supabase Auth)
 * Dijalankan langsung oleh Node (type stripping): `pnpm --filter @ekasatra/db seed`.
 */
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { DEFAULT_SETTINGS } from './default-settings.ts';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL wajib diset');

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

try {
  // 1. Settings default — tidak menimpa nilai yang sudah diubah Admin.
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await sql`
      insert into settings (key, value)
      values (${key}, ${sql.json(value as postgres.JSONValue)})
      on conflict (key) do nothing`;
  }
  console.log(`settings: ${Object.keys(DEFAULT_SETTINGS).length} key dipastikan ada`);

  // 2. Akun awal: Admin (wajib) dan Superadmin (opsional, hanya satu di seluruh sistem).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  async function seedAccount(label: string, prefix: string, role: 'Admin' | 'SuperAdmin') {
    const email = process.env[`${prefix}_EMAIL`]?.trim().toLowerCase();
    const password = process.env[`${prefix}_PASSWORD`];
    const fullName = process.env[`${prefix}_NAME`]?.trim() || label;
    if (!email) throw new Error(`${prefix}_EMAIL wajib diset`);

    const [existing] = await sql`select id, role from profiles where lower(email) = ${email}`;
    if (existing) {
      // Akun sudah ada: cukup pastikan rolenya benar (mis. menaikkan akun lama jadi Superadmin).
      if (existing.role !== role) {
        await sql`update profiles set role = ${role}::user_role where id = ${existing.id}`;
        console.log(`${label}: ${email} role diubah ke ${role}`);
      } else {
        console.log(`${label}: ${email} sudah ada, dilewati`);
      }
      return;
    }

    if (!password || password.length < 8) {
      throw new Error(`${prefix}_PASSWORD (min 8 karakter) wajib diset untuk membuat akun baru`);
    }
    if (!url || !serviceKey)
      throw new Error('NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diset');
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`gagal membuat user Auth: ${error?.message}`);

    try {
      await sql`
        insert into profiles (id, email, full_name, role)
        values (${data.user.id}, ${email}, ${fullName}, ${role}::user_role)`;
    } catch (e) {
      await supabase.auth.admin.deleteUser(data.user.id); // jangan tinggalkan user Auth yatim
      throw e;
    }
    console.log(`${label}: ${email} dibuat`);
  }

  await seedAccount('Admin', 'SEED_ADMIN', 'Admin');
  if (process.env.SEED_SUPERADMIN_EMAIL) {
    await seedAccount('Super Admin', 'SEED_SUPERADMIN', 'SuperAdmin');
  } else {
    console.log('superadmin: SEED_SUPERADMIN_EMAIL tidak diset, dilewati');
  }
} finally {
  await sql.end();
}
