/**
 * GET /api/v1/reports/cases — Laporan Perkara (Admin only) (PRD §5.11 & G2)
 * Query: ?startDate=...&endDate=...&status=...&clientId=...&format=json|csv
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, getCasesReport, exportToCsv } from '@ekasatra/core';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const filter = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    status: url.searchParams.get('status') || undefined,
    clientId: url.searchParams.get('clientId') || undefined,
  };

  if (format === 'csv') {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getCasesReport(db, user, filter);
    const headers = [
      { key: 'regNo', label: 'No. Registrasi' },
      { key: 'title', label: 'Judul Perkara' },
      { key: 'clientName', label: 'Klien' },
      { key: 'court', label: 'Pengadilan' },
      { key: 'caseNumber', label: 'No. Perkara' },
      { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Tgl Mulai' },
      { key: 'putusDate', label: 'Tgl Putus' },
      { key: 'upayaDeadline', label: 'Batas Upaya Hukum' },
    ];
    const csvContent = exportToCsv(headers, data as any);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-perkara-${Date.now()}.csv"`,
      },
    });
  }

  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getCasesReport(db, user, filter);
    return ok(data);
  });
}

