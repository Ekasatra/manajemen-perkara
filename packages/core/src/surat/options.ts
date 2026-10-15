/** Opsi dropdown untuk form surat (Agent E): perkara yang terlihat & staf aktif. */
import { desc, eq, inArray } from 'drizzle-orm';
import { cases, profiles } from '@ekasatra/db';
import type { AuthContext } from '../kernel/auth';
import type { DbExecutor } from '../kernel/db-helpers';
import { defaultDeps, type SuratDeps } from './deps';

export async function listCaseOptions(
  db: DbExecutor,
  user: AuthContext,
  deps: SuratDeps = defaultDeps,
) {
  const visible = await deps.cases.visibleCaseIds(db, user);
  if (visible !== 'all' && visible.length === 0) return [];
  return db
    .select({ id: cases.id, regNo: cases.regNo, title: cases.title })
    .from(cases)
    .where(visible === 'all' ? undefined : inArray(cases.id, visible))
    .orderBy(desc(cases.createdAt))
    .limit(200);
}

export async function listStaffOptions(db: DbExecutor) {
  return db
    .select({ id: profiles.id, fullName: profiles.fullName, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.isActive, true))
    .orderBy(profiles.fullName);
}
