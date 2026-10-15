/**
 * POST /api/v1/auth/login — login dengan throttle (Agent C · C1).
 * PRD §5.1: 5 gagal → kunci 15 menit. Akun nonaktif → tolak.
 */
import { sql } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  logActivity,
  normalizeRole,
} from '@ekasatra/core';
import { unauthorized, forbidden } from '@ekasatra/shared';
import { loginSchema } from '@ekasatra/shared';

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  return runRoute(async () => {
    const body = await parseBody(req, loginSchema);
    const db = createDb();

    // Cari profil by email (case-insensitive).
    const [profile] = await db
      .select()
      .from(profiles)
      .where(sql`lower(${profiles.email}) = ${body.email.toLowerCase()}`)
      .limit(1);

    // Akun terkunci?
    if (profile?.lockedUntil && new Date(profile.lockedUntil) > new Date()) {
      throw forbidden('Akun terkunci karena 5x gagal. Coba lagi dalam 15 menit.');
    }

    // Akun nonaktif?
    if (profile && !profile.isActive) {
      throw forbidden('Akun dinonaktifkan. Hubungi admin.');
    }

    // Sign in via Supabase Auth (cookie-based).
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.user) {
      // Throttle: increment failed count.
      if (profile) {
        const newCount = profile.failedLoginCount + 1;
        const shouldLock = newCount >= MAX_FAILED;
        await db
          .update(profiles)
          .set({
            failedLoginCount: newCount,
            lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MS) : profile.lockedUntil,
          })
          .where(sql`${profiles.id} = ${profile.id}`);
      }

      await logActivity(db, {
        userId: profile?.id ?? null,
        userName: profile?.fullName ?? body.email,
        action: 'login_failed',
        module: 'auth',
        description: `Upaya login gagal untuk ${body.email}`,
      });

      throw unauthorized('Email atau password salah');
    }

    // Sukses: reset throttle, catat last login.
    if (profile) {
      await db
        .update(profiles)
        .set({
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        })
        .where(sql`${profiles.id} = ${profile.id}`);
    }

    await logActivity(db, {
      userId: data.user.id,
      userName: profile?.fullName ?? body.email,
      action: 'login',
      module: 'auth',
      description: 'Login berhasil',
    });

    return ok({
      userId: data.user.id,
      email: profile?.email ?? body.email,
      fullName: profile?.fullName ?? '',
      role: normalizeRole(profile?.role ?? ''),
    });
  });
}
