/**
 * Seed minimal (idempoten): settings default + 1 Admin.
 *   DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (≥ 8), [SEED_ADMIN_NAME]
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

  // 2. Admin pertama.
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME?.trim() || 'Admin';
  if (!email || !password || password.length < 8) {
    throw new Error(
      'SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (min 8 karakter) wajib diset untuk membuat Admin',
    );
  }

  const [existing] = await sql`select id from profiles where lower(email) = ${email}`;
  if (existing) {
    console.log(`admin: ${email} sudah ada, dilewati`);
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
        values (${data.user.id}, ${email}, ${fullName}, 'Admin')`;
    } catch (e) {
      await supabase.auth.admin.deleteUser(data.user.id); // jangan tinggalkan user Auth yatim
      throw e;
    }
    console.log(`admin: ${email} dibuat`);
  }
} finally {
  await sql.end();
}
