/**
 * GET /api/v1/reports/surat-masuk — Laporan Surat Masuk (Admin only) (PRD §5.11 & G2)
 * Query: ?startDate=...&endDate=...&status=...&sifat=...&caseId=...&format=json|csv
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, getSuratMasukReport, exportToCsv } from '@ekasatra/core';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const filter = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    status: url.searchParams.get('status') || undefined,
    sifat: url.searchParams.get('sifat') || undefined,
    caseId: url.searchParams.get('caseId') || undefined,
  };

  if (format === 'csv') {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getSuratMasukReport(db, user, filter);
    const headers = [
      { key: 'noAgenda', label: 'No. Agenda' },
      { key: 'noSurat', label: 'No. Surat' },
      { key: 'sender', label: 'Pengirim' },
      { key: 'subject', label: 'Perihal' },
      { key: 'tglSurat', label: 'Tgl Surat' },
      { key: 'tglTerima', label: 'Tgl Terima' },
      { key: 'sifat', label: 'Sifat' },
      { key: 'status', label: 'Status' },
      { key: 'assignedToName', label: 'Disposisi Ke' },
      { key: 'caseTitle', label: 'Perkara' },
    ];
    const csvContent = exportToCsv(headers, data as any);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-surat-masuk-${Date.now()}.csv"`,
      },
    });
  }

  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getSuratMasukReport(db, user, filter);
    return ok(data);
  });
}

