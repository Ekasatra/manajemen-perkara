/**
 * Halaman Pengaturan (Agent C · C6).
 * Admin: baca/ubah semua; non-Admin: baca saja.
 */
import { createDb, settings } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can } from '@ekasatra/core';
import { SettingsForm } from '@/modules/settings/settings-form';

export default async function SettingsPage() {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'settings');

  const rows = await db.select().from(settings);
  const allSettings: Record<string, unknown> = {};
  for (const row of rows) {
    allSettings[row.key] = row.value;
  }

  const canEdit = can(user, 'U', 'settings');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-navy-700">Pengaturan</h1>
      <SettingsForm initialSettings={allSettings} canEdit={canEdit} />
    </div>
  );
}
