/**
 * Pembungkus route keuangan (Agent F): satu klien DB per proses, sesi → `AuthContext`,
 * hasil `ok()`/AppError → JSON seragam lewat `runRoute`.
 */
import { createDb, type Db } from '@ekasatra/db';
import { ok, requireUser, runRoute, type AuthContext } from '@ekasatra/core';
import { createSupabaseServerClient } from '@/lib/supabase-server';

let shared: Db | undefined;

export function getDb(): Db {
  shared ??= createDb();
  return shared;
}

export function route(
  handler: (ctx: { db: Db; user: AuthContext }) => Promise<unknown>,
): Promise<Response> {
  return runRoute(async () => {
    const db = getDb();
    const user = await requireUser(db, await createSupabaseServerClient());
    return ok(await handler({ db, user }));
  });
}

/** Untuk Server Component: sesi + DB (AppError dilempar ke error boundary). */
export async function pageContext(): Promise<{ db: Db; user: AuthContext }> {
  const db = getDb();
  const user = await requireUser(db, await createSupabaseServerClient());
  return { db, user };
}

export type RouteParams<T extends string> = { params: Promise<Record<T, string>> };
