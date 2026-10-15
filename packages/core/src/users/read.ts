import { eq, inArray } from 'drizzle-orm';
import { profiles } from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';

export interface UserNotificationProfile {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  emailApproval: boolean;
  emailReminder: boolean;
  emailDisposisi: boolean;
}

/**
 * Baca profil notifikasi user (email, nama, status aktif, preferensi email).
 */
export async function getUserNotificationProfile(
  db: DbExecutor,
  userId: string,
): Promise<UserNotificationProfile | null> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      isActive: profiles.isActive,
      emailApproval: profiles.emailApproval,
      emailReminder: profiles.emailReminder,
      emailDisposisi: profiles.emailDisposisi,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Baca profil notifikasi beberapa user sekaligus.
 */
export async function getMultipleUserNotificationProfiles(
  db: DbExecutor,
  userIds: string[],
): Promise<UserNotificationProfile[]> {
  if (userIds.length === 0) return [];
  return db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      isActive: profiles.isActive,
      emailApproval: profiles.emailApproval,
      emailReminder: profiles.emailReminder,
      emailDisposisi: profiles.emailDisposisi,
    })
    .from(profiles)
    .where(inArray(profiles.id, userIds));
}

