/**
 * GET  /api/v1/users     — daftar user (Admin only) (Agent C · C2)
 * POST /api/v1/users     — buat user (Admin only)
 */
import { count, desc, sql } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServiceClient } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  logActivity,
} from '@ekasatra/core';
import { conflict, internalError } from '@ekasatra/shared';
import { createUserSchema } from '@ekasatra/shared';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';

export async function GET(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'users');

    const url = new URL(req.url);
    const params: SearchParams = Object.fromEntries(url.searchParams.entries());
    const { page, pageSize, offset } = parsePageQuery(params);

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: profiles.id,
          email: profiles.email,
          fullName: profiles.fullName,
          role: profiles.role,
          isActive: profiles.isActive,
          lastLoginAt: profiles.lastLoginAt,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .orderBy(desc(profiles.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(profiles),
    ]);

    const total = countRows[0]?.value ?? 0;

    return ok({ rows, page, pageSize, total });
  });
}

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'C', 'users');

    const body = await parseBody(req, createUserSchema);

    // Cek email unik (case-insensitive).
    const [existing] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(sql`lower(${profiles.email}) = ${body.email.toLowerCase()}`)
      .limit(1);
    if (existing) throw conflict('Email sudah terdaftar');

    // Buat user di Supabase Auth.
    const supabaseService = createSupabaseServiceClient();
    const { data, error } = await supabaseService.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw internalError(`Gagal membuat user Auth: ${error?.message ?? 'unknown'}`);
    }

    // Buat profil.
    try {
      await db.insert(profiles).values({
        id: data.user.id,
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        isActive: body.isActive,
        emailApproval: body.emailApproval,
        emailReminder: body.emailReminder,
        emailDisposisi: body.emailDisposisi,
      });
    } catch (e) {
      await supabaseService.auth.admin.deleteUser(data.user.id);
      throw e;
    }

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'create',
      module: 'users',
      entityType: 'user',
      entityId: data.user.id,
      description: `Buat user ${body.fullName} (${body.email}) sebagai ${body.role}`,
    });

    return ok({
      id: data.user.id,
      email: body.email,
      fullName: body.fullName,
      role: body.role,
    });
  });
}
