/**
 * GET /api/v1/reports/schedules — Laporan Jadwal (Admin only) (PRD §5.11 & G2)
 * Query: ?startDate=...&endDate=...&status=...&kind=...&caseId=...&format=json|csv
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, getSchedulesReport, exportToCsv } from '@ekasatra/core';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const filter = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    status: url.searchParams.get('status') || undefined,
    kind: url.searchParams.get('kind') || undefined,
    caseId: url.searchParams.get('caseId') || undefined,
  };

  if (format === 'csv') {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getSchedulesReport(db, user, filter);
    const headers = [
      { key: 'scheduleDate', label: 'Tanggal' },
      { key: 'scheduleTime', label: 'Waktu' },
      { key: 'kind', label: 'Jenis' },
      { key: 'caseTitle', label: 'Perkara' },
      { key: 'location', label: 'Lokasi' },
      { key: 'notes', label: 'Catatan' },
      { key: 'status', label: 'Status' },
    ];
    const csvContent = exportToCsv(headers, data);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-jadwal-${Date.now()}.csv"`,
      },
    });
  }

  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getSchedulesReport(db, user, filter);
    return ok(data);
  });
}

