import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan } from '@ekasatra/core';
import { ReportsView } from '@/modules/reports/reports-view';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  try {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'reports');

    return <ReportsView />;
  } catch (err: any) {
    if (err?.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    if (err?.code === 'FORBIDDEN') {
      return (
        <div className="flex h-96 flex-col items-center justify-center text-center">
          <h2 className="text-xl font-bold text-navy-800">Akses Ditolak</h2>
          <p className="mt-2 text-sm text-gray-500">
            Halaman laporan hanya dapat diakses oleh Administrator kantor.
          </p>
        </div>
      );
    }
    throw err;
  }
}

