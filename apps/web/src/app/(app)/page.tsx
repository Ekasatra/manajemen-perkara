import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { can, requireUser, getDashboardData, listCases } from '@ekasatra/core';
import { DashboardView } from '@/modules/dashboard/dashboard-view';
import { EmptyState } from '@/shell/states';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const RECENT_CASES = 5;

export default async function HomePage() {
  let data;
  let recentCases;
  let canCreateCase = false;
  try {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    // Daftar ini lewat listCases, jadi sudah dibatasi perkara yang boleh dilihat user (scope_assigned_only).
    const [dashboard, recent] = await Promise.all([
      getDashboardData(db, user),
      listCases(db, user, { page: 1, pageSize: RECENT_CASES, offset: 0 }),
    ]);
    data = dashboard;
    recentCases = recent.rows;
    canCreateCase = can(user, 'C', 'cases');
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === 'UNAUTHORIZED') redirect('/login');
    if (code === 'FORBIDDEN') {
      return (
        <EmptyState
          title="Akses dibatasi"
          hint="Akun Anda belum aktif atau tidak memiliki hak akses ke beranda. Hubungi Admin."
        />
      );
    }
    throw err;
  }
  return <DashboardView data={data} recentCases={recentCases} canCreateCase={canCreateCase} />;
}
