/**
 * Halaman Profil Saya: data diri, preferensi notifikasi email, dan ganti password.
 * Berlaku untuk semua peran; hanya mengubah profil milik pengguna yang sedang masuk.
 */
import { eq } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
import { ROLE_LABEL } from '@/lib/role-label';
import { ProfileForms } from '@/modules/profile/profile-forms';

export default async function ProfilePage() {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  const [p] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);

  return (
    <div>
      <PageHeader title="Profil Saya" />
      <ProfileForms
        email={user.email}
        roleLabel={ROLE_LABEL[user.role] ?? ''}
        initial={{
          fullName: p?.fullName ?? user.fullName,
          emailApproval: p?.emailApproval ?? true,
          emailReminder: p?.emailReminder ?? true,
          emailDisposisi: p?.emailDisposisi ?? true,
        }}
      />
    </div>
  );
}
