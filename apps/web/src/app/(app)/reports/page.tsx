import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan } from '@ekasatra/core';
import { ReportsView } from '@/modules/reports/reports-view';
import { EmptyState } from '@/shell/states';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  try {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'reports');
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === 'UNAUTHORIZED') redirect('/login');
    if (code === 'FORBIDDEN') {
      return (
        <EmptyState
          title="Akses ditolak"
          hint="Halaman laporan hanya dapat diakses oleh Admin kantor."
        />
      );
    }
    throw err;
  }
  return <ReportsView />;
}
