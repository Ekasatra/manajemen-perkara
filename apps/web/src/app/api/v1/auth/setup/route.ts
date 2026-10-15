/**
 * POST /api/v1/auth/setup — buat Admin pertama (Agent C · C1).
 * PRD §5.1: bila belum ada user, halaman pertama membuat Admin pertama.
 * Hanya boleh bila tabel profiles kosong.
 */
import { sql } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServiceClient } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  logActivity,
  normalizeRole,
} from '@ekasatra/core';
import { conflict, internalError } from '@ekasatra/shared';
import { setupSchema } from '@ekasatra/shared';

export async function POST(req: Request) {
  return runRoute(async () => {
    const body = await parseBody(req, setupSchema);
    const db = createDb();

    // Pastikan belum ada profile — setup hanya untuk Admin pertama.
    const countRows = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(profiles);
    const total = countRows[0]?.value ?? 0;
    if (total > 0) {
      throw conflict('Setup sudah selesai. Hubungi admin untuk membuat akun baru.');
    }

    // Buat user di Supabase Auth (service role).
    const supabaseService = createSupabaseServiceClient();
    const { data, error } = await supabaseService.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw internalError(`Gagal membuat user Auth: ${error?.message ?? 'unknown'}`);
    }

    // Buat profil Admin.
    try {
      await db.insert(profiles).values({
        id: data.user.id,
        email: body.email,
        fullName: body.fullName,
        role: 'Admin',
      });
    } catch (e) {
      // Rollback: hapus user Auth bila profil gagal dibuat.
      await supabaseService.auth.admin.deleteUser(data.user.id);
      throw e;
    }

    // Sign in otomatis (cookie-based).
    const supabaseServer = await createSupabaseServerClient();
    await supabaseServer.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    await logActivity(db, {
      userId: data.user.id,
      userName: body.fullName,
      action: 'setup_admin',
      module: 'auth',
      description: 'Admin pertama dibuat',
    });

    return ok({
      userId: data.user.id,
      email: body.email,
      fullName: body.fullName,
      role: normalizeRole('Admin'),
    });
  });
}
