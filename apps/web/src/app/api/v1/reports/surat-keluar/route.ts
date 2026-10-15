/**
 * GET /api/v1/reports/surat-keluar — Laporan Surat Keluar (Admin only) (PRD §5.11 & G2)
 * Query: ?startDate=...&endDate=...&status=...&jenis=...&caseId=...&format=json|csv
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, getSuratKeluarReport, exportToCsv } from '@ekasatra/core';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const filter = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    status: url.searchParams.get('status') || undefined,
    jenis: url.searchParams.get('jenis') || undefined,
    caseId: url.searchParams.get('caseId') || undefined,
  };

  if (format === 'csv') {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getSuratKeluarReport(db, user, filter);
    const headers = [
      { key: 'noSurat', label: 'No. Surat' },
      { key: 'subject', label: 'Perihal' },
      { key: 'destination', label: 'Tujuan' },
      { key: 'jenis', label: 'Jenis' },
      { key: 'tglSurat', label: 'Tgl Surat' },
      { key: 'status', label: 'Status' },
      { key: 'creatorName', label: 'Pembuat' },
      { key: 'reviewerName', label: 'Reviewer' },
      { key: 'signerName', label: 'Penandatangan' },
      { key: 'caseTitle', label: 'Perkara' },
    ];
    const csvContent = exportToCsv(headers, data as any);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-surat-keluar-${Date.now()}.csv"`,
      },
    });
  }

  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getSuratKeluarReport(db, user, filter);
    return ok(data);
  });
}

