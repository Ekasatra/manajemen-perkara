/**
 * GET /api/v1/notifications — Notifikasi personal dashboard pengguna (PRD §5.10 & G6)
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  requireUser,
  getDashboardData,
  getApprovalMenungguSaya,
  getSuratPersonalNotifications,
} from '@ekasatra/core';

export async function GET(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    // `?ringkas=1` dipakai lencana di topbar/sidebar: hanya surat, tanpa 11 query dashboard.
    if (new URL(req.url).searchParams.get('ringkas') === '1') {
      // Approval dijalankan sekali, hasilnya dipakai ulang oleh notifikasi personal.
      const approval = await getApprovalMenungguSaya(db, user.userId);
      const notifications = await getSuratPersonalNotifications(db, user.userId, approval);
      return ok({ notifications, approvalCount: approval.count });
    }

    const data = await getDashboardData(db, user);
    return ok({
      notifications: data.notifikasiPersonal,
      approvalCount: data.approvalMenungguSaya.count,
    });
  });
}
