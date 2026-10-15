/**
 * GET /api/v1/reports/cases/[id]/pdf — Export progres satu perkara (PDF/Print) (PRD §5.11 & G2)
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, getCaseProgress, getSetting } from '@ekasatra/core';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);

  const progress = await getCaseProgress(db, user, id);
  const officeName = await getSetting<string>(
    db,
    'office_name',
    'EKASATRA Law & Policy Advisory',
  );
  const officeAddress = await getSetting<string>(db, 'office_address', '');
  const officePhone = await getSetting<string>(db, 'office_phone', '');

  const timelineRows = progress.timeline
    .map(
      (t) => `
      <tr>
        <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px; white-space: nowrap;">${t.eventDate}</td>
        <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px;"><span style="background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${t.eventType}</span></td>
        <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px;"><strong>${t.title}</strong>${t.description ? `<br/><span style="color: #64748B;">${t.description}</span>` : ''}</td>
      </tr>`,
    )
    .join('');

  const scheduleRows = progress.schedules
    .map(
      (s) => `
      <tr>
        <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px; white-space: nowrap;">${s.scheduleDate}${s.scheduleTime ? ` ${s.scheduleTime}` : ''}</td>
        <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px;">${s.kind}</td>
        <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px;">${s.location || '-'}</td>
        <td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px;">${s.status}</td>
      </tr>`,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Progres Perkara - ${progress.caseInfo.regNo}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; }
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 24px; line-height: 1.5;">
  <div style="border-bottom: 2px solid #1A2E44; padding-bottom: 12px; margin-bottom: 20px;">
    <h1 style="margin: 0; color: #1A2E44; font-size: 18px; text-transform: uppercase;">${officeName}</h1>
    ${officeAddress ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">${officeAddress}</p>` : ''}
    ${officePhone ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748B;">Telp: ${officePhone}</p>` : ''}
  </div>

  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 12px 0; color: #1A2E44; font-size: 16px;">LAPORAN PROGRES PERKARA</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0; width: 140px; color: #64748B;">No. Registrasi:</td>
        <td style="padding: 4px 0; font-weight: 600;">${progress.caseInfo.regNo}</td>
        <td style="padding: 4px 0; width: 140px; color: #64748B;">Status:</td>
        <td style="padding: 4px 0; font-weight: 600;">${progress.caseInfo.status}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748B;">Judul Perkara:</td>
        <td style="padding: 4px 0; font-weight: 600;">${progress.caseInfo.title}</td>
        <td style="padding: 4px 0; color: #64748B;">Klien:</td>
        <td style="padding: 4px 0; font-weight: 600;">${progress.caseInfo.clientName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748B;">Pengadilan / No:</td>
        <td style="padding: 4px 0;">${progress.caseInfo.court || '-'} ${progress.caseInfo.caseNumber ? `(${progress.caseInfo.caseNumber})` : ''}</td>
        <td style="padding: 4px 0; color: #64748B;">Tgl Mulai:</td>
        <td style="padding: 4px 0;">${progress.caseInfo.startDate || '-'}</td>
      </tr>
      ${progress.caseInfo.upayaDeadline ? `
      <tr>
        <td style="padding: 4px 0; color: #DC2626; font-weight: 600;">Batas Upaya Hukum:</td>
        <td style="padding: 4px 0; color: #DC2626; font-weight: 600;" colspan="3">${progress.caseInfo.upayaDeadline}</td>
      </tr>` : ''}
    </table>
  </div>

  <h3 style="color: #1A2E44; font-size: 14px; margin: 20px 0 8px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">Riwayat Timeline Perkara</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="background: #F1F5F9;">
        <th style="border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left; width: 100px;">Tanggal</th>
        <th style="border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left; width: 120px;">Jenis</th>
        <th style="border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left;">Keterangan</th>
      </tr>
    </thead>
    <tbody>${timelineRows || '<tr><td colspan="3" style="text-align: center; padding: 12px; color: #94A3B8; font-size: 12px;">Belum ada catatan timeline</td></tr>'}</tbody>
  </table>

  <h3 style="color: #1A2E44; font-size: 14px; margin: 20px 0 8px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">Jadwal Sidang & Agenda</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #F1F5F9;">
        <th style="border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left; width: 140px;">Tanggal & Waktu</th>
        <th style="border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left; width: 120px;">Agenda</th>
        <th style="border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left;">Lokasi</th>
        <th style="border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left; width: 100px;">Status</th>
      </tr>
    </thead>
    <tbody>${scheduleRows || '<tr><td colspan="4" style="text-align: center; padding: 12px; color: #94A3B8; font-size: 12px;">Belum ada jadwal</td></tr>'}</tbody>
  </table>
</body>
</html>
`.trim();

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
