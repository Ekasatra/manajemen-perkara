/**
 * Kernel aktivitas (milik Agent A) — pencatatan audit ke `activity_logs`.
 * Dipanggil modul mana pun lewat kernel; tidak ada modul yang menulis
 * tabel ini langsung.
 */
import { activityLogs } from '@ekasatra/db';
import type { DbExecutor } from './db-helpers';

export interface ActivityLogInput {
  userId?: string | null;
  /** Snapshot nama agar log tetap terbaca bila user dihapus / login gagal. */
  userName?: string | null;
  /** Mis. 'create', 'update', 'delete', 'login_failed'. */
  action: string;
  /** Mis. 'cases', 'surat-keluar', 'auth'. */
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Tulis satu baris audit log. Tidak pernah melempar lebih dalam dari pemanggil. */
export async function logActivity(db: DbExecutor, input: ActivityLogInput): Promise<void> {
  await db.insert(activityLogs).values({
    userId: input.userId ?? null,
    userName: input.userName ?? null,
    action: input.action,
    module: input.module,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    description: input.description ?? null,
    metadata: input.metadata ?? null,
  });
}
