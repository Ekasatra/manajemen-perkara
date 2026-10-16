import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { can, requireUser, getDashboardData } from '@ekasatra/core';
import { ROLE_LABEL } from '@/lib/role-label';
import { DashboardView } from '@/modules/dashboard/dashboard-view';
import type { DashboardViewer } from '@/modules/dashboard/dashboard-view';
import { EmptyState } from '@/shell/states';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let data;
  let viewer: DashboardViewer;
  try {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    data = await getDashboardData(db, user);
    viewer = {
      name: user.fullName,
      roleLabel: ROLE_LABEL[user.role] ?? '',
      canCreateCase: can(user, 'C', 'cases'),
      canCreateSuratMasuk: can(user, 'C', 'surat_masuk'),
      canCreateSuratKeluar: can(user, 'C', 'surat_keluar'),
      canReadAudit: can(user, 'R', 'audit_log'),
    };
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
  return <DashboardView data={data} viewer={viewer} />;
}
