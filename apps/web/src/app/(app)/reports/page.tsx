import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, listCases } from '@ekasatra/core';
import { listClientOptions } from '@ekasatra/core/finance';
import { ReportsView } from '@/modules/reports/reports-view';
import { EmptyState } from '@/shell/states';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  let clients: { id: string; label: string }[] = [];
  let cases: { id: string; label: string }[] = [];
  try {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'reports');
    const [clientOptions, caseList] = await Promise.all([
      listClientOptions(db),
      listCases(db, user, { page: 1, pageSize: 200, offset: 0 }),
    ]);
    clients = clientOptions;
    cases = caseList.rows.map((c) => ({ id: c.id, label: `${c.regNo} · ${c.title}` }));
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
  return <ReportsView clients={clients} cases={cases} />;
}
