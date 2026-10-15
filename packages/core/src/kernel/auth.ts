/**
 * Kernel auth (milik Agent A) — konteks user untuk semua route.
 * `requireUser()` memvalidasi JWT Supabase lalu memuat profil dari tabel
 * `profiles`; dipakai modul lain, jangan duplikasi di tiap route.
 */
import { eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { forbidden, unauthorized, type Role } from '@ekasatra/shared';
import { profiles } from '@ekasatra/db';
import { normalizeRole } from './policy';
import type { DbExecutor } from './db-helpers';

export interface AuthContext {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

/**
 * Validasi sesi & muat profil. Lempar:
 * - UNAUTHORIZED bila token tidak valid / tidak ada sesi,
 * - FORBIDDEN bila profil tidak ada atau akun dinonaktifkan.
 */
export async function requireUser(db: DbExecutor, supabase: SupabaseClient): Promise<AuthContext> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw unauthorized();

  const user = data.user;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  if (!profile) throw forbidden('Profil pengguna tidak ditemukan');
  if (!profile.isActive) throw forbidden('Akun dinonaktifkan');

  return {
    userId: user.id,
    email: profile.email,
    fullName: profile.fullName,
    role: normalizeRole(profile.role),
    isActive: true,
  };
}
