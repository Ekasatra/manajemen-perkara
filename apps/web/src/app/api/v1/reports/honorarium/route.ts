/**
 * GET /api/v1/reports/honorarium — Laporan Honorarium (Admin only) (PRD §5.11 & G2)
 * Query: ?startDate=...&endDate=...&status=...&caseId=...&userId=...&format=json|csv
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, getHonorariumReport, exportToCsv } from '@ekasatra/core';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const filter = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    status: url.searchParams.get('status') || undefined,
    caseId: url.searchParams.get('caseId') || undefined,
    userId: url.searchParams.get('userId') || undefined,
  };

  if (format === 'csv') {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getHonorariumReport(db, user, filter);
    const headers = [
      { key: 'caseTitle', label: 'Perkara' },
      { key: 'userName', label: 'Anggota Tim' },
      { key: 'draftAmount', label: 'Draft Honor (Rp)' },
      { key: 'publishedAmount', label: 'Honor Publish (Rp)' },
      { key: 'status', label: 'Status' },
      { key: 'publishedAt', label: 'Tgl Distribusi' },
      { key: 'paidAt', label: 'Tgl Bayar' },
    ];
    const csvContent = exportToCsv(headers, data as any);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-honorarium-${Date.now()}.csv"`,
      },
    });
  }

  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getHonorariumReport(db, user, filter);
    return ok(data);
  });
}

