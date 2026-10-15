/**
 * GET /api/v1/cases/[id]/export — export progres perkara (Agent D · D6, PRD §5.11)
 * Mengembalikan dokumen HTML siap-cetak (landscape A4) dengan kop kantor.
 * Browser mencetak ke PDF lewat dialog print (pola yang sama dengan G2 reports).
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  requireUser,
  ensureCan,
  getCaseDetail,
  getSetting,
} from '@ekasatra/core';
import type { CaseProgressReport } from '@ekasatra/shared';
import { listTimeline, listSchedules } from '@ekasatra/core';
import { toAppError } from '@ekasatra/core';
import { formatDate } from '@/lib/format';

function esc(value: unknown): string {
  return String(value ?? '').replace(/[<>&"]/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return ch;
    }
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'cases');

    // Detail perkara (memastikan visibilitas).
    const caseDetail = await getCaseDetail(db, user, id);

    // Data untuk laporan: timeline + jadwal.
    const [timeline, schedules] = await Promise.all([
      listTimeline(db, user, id),
      listSchedules(db, user, id),
    ]);

    const officeName = await getSetting<string>(db, 'office_name', 'EKASATRA Law & Policy Advisory');
    const officeAddress = await getSetting<string>(db, 'office_address', '');
    const officePhone = await getSetting<string>(db, 'office_phone', '');

    const progress: CaseProgressReport = {
      caseInfo: {
        id: caseDetail.id,
        regNo: caseDetail.regNo,
        title: caseDetail.title,
        clientName: '', // diisi dari join; untuk export HTML kita tampilkan regNo/title
        court: caseDetail.court,
        caseNumber: caseDetail.caseNumber,
        status: caseDetail.status,
        startDate: caseDetail.startDate,
        putusDate: caseDetail.putusDate,
        upayaDeadline: caseDetail.upayaDeadline,
        description: caseDetail.description,
      },
      timeline: timeline.map((t) => ({
        eventDate: t.eventDate,
        eventType: t.eventType,
        title: t.title,
        description: t.description,
      })),
      schedules: schedules.map((s) => ({
        scheduleDate: s.scheduleDate,
        scheduleTime: s.scheduleTime,
        kind: s.kind,
        location: s.location,
        status: s.status,
      })),
    };

    const infoRows = [
      ['No. Registrasi', progress.caseInfo.regNo],
      ['Judul', progress.caseInfo.title],
      ['No. Perkara', progress.caseInfo.caseNumber ?? '-'],
      ['Pengadilan', progress.caseInfo.court ?? '-'],
      ['Status', progress.caseInfo.status],
      ['Tanggal Mulai', progress.caseInfo.startDate ? formatDate(progress.caseInfo.startDate) : '-'],
      ['Tanggal Putus', progress.caseInfo.putusDate ? formatDate(progress.caseInfo.putusDate) : '-'],
      ['Batas Upaya', progress.caseInfo.upayaDeadline ? formatDate(progress.caseInfo.upayaDeadline) : '-'],
    ];

    const timelineRows = progress.timeline
      .map(
        (t) =>
          `<tr><td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(formatDate(t.eventDate))}</td>` +
          `<td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(t.eventType)}</td>` +
          `<td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(t.title)}</td>` +
          `<td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(t.description ?? '')}</td></tr>`,
      )
      .join('');

    const scheduleRows = progress.schedules
      .map(
        (s) =>
          `<tr><td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(formatDate(s.scheduleDate))}</td>` +
          `<td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(s.scheduleTime ?? '-')}</td>` +
          `<td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(s.kind)}</td>` +
          `<td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(s.location ?? '-')}</td>` +
          `<td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:12px;">${esc(s.status)}</td></tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Progres Perkara ${esc(progress.caseInfo.regNo)} - ${esc(officeName)}</title>
  <style>
    @media print { body { margin: 0; padding: 12mm; } @page { size: A4; margin: 10mm; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 24px; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="border-bottom: 2px solid #1A2E44; padding-bottom: 12px; margin-bottom: 20px;">
    <h1 style="margin:0;color:#1A2E44;font-size:20px;text-transform:uppercase;letter-spacing:0.5px;">${esc(officeName)}</h1>
    ${officeAddress ? `<p style="margin:4px 0 0;font-size:12px;color:#64748B;">${esc(officeAddress)}</p>` : ''}
    ${officePhone ? `<p style="margin:2px 0 0;font-size:12px;color:#64748B;">Telp: ${esc(officePhone)}</p>` : ''}
  </div>
  <h2 style="margin:0 0 12px;color:#1A2E44;font-size:16px;">Progres Perkara</h2>
  <table style="margin-bottom:20px;">
    ${infoRows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;font-size:13px;font-weight:600;color:#475569;width:180px;">${esc(k)}</td>` +
          `<td style="padding:4px 0;font-size:13px;">${esc(v)}</td></tr>`,
      )
      .join('')}
  </table>
  ${progress.caseInfo.description ? `<p style="font-size:13px;color:#475569;margin-bottom:20px;">${esc(progress.caseInfo.description)}</p>` : ''}
  <h3 style="color:#1A2E44;font-size:14px;margin-bottom:8px;">Riwayat Timeline</h3>
  <table style="margin-bottom:20px;">
    <thead><tr>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Tanggal</th>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Tipe</th>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Peristiwa</th>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Keterangan</th>
    </tr></thead>
    <tbody>${timelineRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94A3B8;">Tidak ada entri</td></tr>'}</tbody>
  </table>
  <h3 style="color:#1A2E44;font-size:14px;margin-bottom:8px;">Jadwal</h3>
  <table>
    <thead><tr>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Tanggal</th>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Jam</th>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Jenis</th>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Lokasi</th>
      <th style="padding:8px 10px;border:1px solid #CBD5E1;background:#F1F5F9;font-size:13px;text-align:left;">Status</th>
    </tr></thead>
    <tbody>${scheduleRows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#94A3B8;">Tidak ada jadwal</td></tr>'}</tbody>
  </table>
  <p style="margin-top:24px;font-size:11px;color:#94A3B8;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="progres-${progress.caseInfo.regNo.replace(/\//g, '-')}.html"`,
      },
    });
  } catch (err) {
    const appError = toAppError(err);
    return Response.json(
      { ok: false, error: { code: appError.code, message: appError.message } },
      { status: appError.status },
    );
  }
}
