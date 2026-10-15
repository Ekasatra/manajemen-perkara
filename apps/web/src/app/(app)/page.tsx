import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, getDashboardData } from '@ekasatra/core';
import { DashboardView } from '@/modules/dashboard/dashboard-view';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getDashboardData(db, user);
    return <DashboardView data={data} />;
  } catch (err: any) {
    // Jika belum login, redirect ke /login
    if (err?.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    // Jika tidak terotorisasi atau akun belum aktif
    if (err?.code === 'FORBIDDEN') {
      return (
        <div className="flex h-96 flex-col items-center justify-center text-center">
          <h2 className="text-xl font-bold text-navy-800">Akses Dibatasi</h2>
          <p className="mt-2 text-sm text-gray-500">
            Akun Anda belum aktif atau tidak memiliki hak akses dashboard.
          </p>
        </div>
      );
    }
    throw err;
  }
}
