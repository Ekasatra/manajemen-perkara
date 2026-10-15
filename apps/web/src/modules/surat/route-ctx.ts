/** Konteks route modul surat (Agent E): db + user terautentikasi, satu tempat. */
import { createDb } from '@ekasatra/db';
import { requireUser, runRoute, type AppResult } from '@ekasatra/core';
import type { AuthContext, DbExecutor } from '@ekasatra/core';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export function withUser(
  fn: (ctx: { db: DbExecutor; user: AuthContext }) => Promise<AppResult<unknown>>,
): Promise<Response> {
  return runRoute(async () => {
    const db = createDb();
    const user = await requireUser(db, await createSupabaseServerClient());
    return fn({ db, user });
  });
}
