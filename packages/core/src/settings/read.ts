import { eq } from 'drizzle-orm';
import { settings, DEFAULT_SETTINGS } from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';

/**
 * Baca satu nilai pengaturan dari tabel `settings`.
 * Fallback ke DEFAULT_SETTINGS atau defaultValue bila belum tersimpan di DB.
 */
export async function getSetting<T = unknown>(
  db: DbExecutor,
  key: string,
  defaultValue?: T,
): Promise<T> {
  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  const first = rows[0];
  if (first && first.value !== undefined && first.value !== null) {
    return first.value as T;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  return (DEFAULT_SETTINGS[key] ?? null) as T;
}

/**
 * Baca seluruh pengaturan, digabung dengan DEFAULT_SETTINGS.
 */
export async function getAllSettings(db: DbExecutor): Promise<Record<string, unknown>> {
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings);
  const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}

