import { redirect } from 'next/navigation';
import { createDb, profiles } from '@ekasatra/db';
import { count } from 'drizzle-orm';
import { SetupForm } from './setup-form';

/**
 * Halaman setup Admin pertama (PRD §5.1).
 * Bila sudah ada profil → redirect ke /login.
 */
export default async function SetupPage() {
  let hasProfiles = false;
  try {
    const db = createDb();
    const [result] = await db.select({ value: count() }).from(profiles);
    hasProfiles = (result?.value ?? 0) > 0;
  } catch {
    // DB belum siap — tampilkan form setup (akan gagal saat submit dengan pesan jelas).
  }

  if (hasProfiles) {
    redirect('/login');
  }

  return <SetupForm />;
}
