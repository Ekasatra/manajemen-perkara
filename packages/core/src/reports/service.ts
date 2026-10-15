import type { DbExecutor } from '../kernel/db-helpers';
import type { PolicyUser } from '../kernel/policy';
import { ensureCan } from '../kernel/policy';
import type {
  CasesReportFilter,
  CasesReportItem,
  SuratMasukReportFilter,
  SuratMasukReportItem,
  SuratKeluarReportFilter,
  SuratKeluarReportItem,
  HonorariumReportFilter,
  HonorariumReportItem,
  SchedulesReportFilter,
  SchedulesReportItem,
  CaseProgressReport,
} from '@ekasatra/shared';
import { notFound } from '@ekasatra/shared';
import { listCasesForReport, listSchedulesForReport, getCaseProgressForReport } from '../cases/read';
import { listSuratMasukForReport, listSuratKeluarForReport } from '../surat/read';
import { listHonorariumForReport } from '../finance/read';
import { getSetting } from '../settings/read';

/**
 * 1. Laporan Perkara (Admin only) (PRD §5.11).
 */
export async function getCasesReport(
  db: DbExecutor,
  user: PolicyUser,
  filter?: CasesReportFilter,
): Promise<CasesReportItem[]> {
  ensureCan(user, 'R', 'reports');
  return listCasesForReport(db, filter);
}

/**
 * 2. Laporan Surat Masuk (Admin only) (PRD §5.11).
 */
export async function getSuratMasukReport(
  db: DbExecutor,
  user: PolicyUser,
  filter?: SuratMasukReportFilter,
): Promise<SuratMasukReportItem[]> {
  ensureCan(user, 'R', 'reports');
  return listSuratMasukForReport(db, filter);
}

/**
 * 3. Laporan Surat Keluar (Admin only) (PRD §5.11).
 */
export async function getSuratKeluarReport(
  db: DbExecutor,
  user: PolicyUser,
  filter?: SuratKeluarReportFilter,
): Promise<SuratKeluarReportItem[]> {
  ensureCan(user, 'R', 'reports');
  return listSuratKeluarForReport(db, filter);
}

/**
 * 4. Laporan Honorarium (Admin only) (PRD §5.11).
 */
export async function getHonorariumReport(
  db: DbExecutor,
  user: PolicyUser,
  filter?: HonorariumReportFilter,
): Promise<HonorariumReportItem[]> {
  ensureCan(user, 'R', 'reports');
  return listHonorariumForReport(db, filter);
}

/**
 * 5. Laporan Jadwal (Admin only) (PRD §5.11).
 */
export async function getSchedulesReport(
  db: DbExecutor,
  user: PolicyUser,
  filter?: SchedulesReportFilter,
): Promise<SchedulesReportItem[]> {
  ensureCan(user, 'R', 'reports');
  return listSchedulesForReport(db, filter);
}

/**
 * Export Progres Satu Perkara (Admin only) (PRD §5.11).
 */
export async function getCaseProgress(
  db: DbExecutor,
  user: PolicyUser,
  caseId: string,
): Promise<CaseProgressReport> {
  ensureCan(user, 'R', 'reports');
  const res = await getCaseProgressForReport(db, caseId);
  if (!res) {
    throw notFound(`Perkara dengan ID ${caseId} tidak ditemukan`);
  }
  return res;
}

/**
 * Utilitas ekspor data tabular ke format CSV standar RFC 4180 dengan UTF-8 BOM.
 */
export function exportToCsv(
  headers: { key: string; label: string }[],
  data: readonly object[],
): string {
  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Cegah formula injection di Excel (sel teks diawali = + - @ tab CR).
    if (typeof val === 'string' && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map((h) => escapeCsv(h.label)).join(',');
  const rows = data.map((item) =>
    headers.map((h) => escapeCsv((item as Record<string, unknown>)[h.key])).join(','),
  );

  // \uFEFF adalah BOM (Byte Order Mark) agar karakter UTF-8 terbaca sempurna di Microsoft Excel
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * Utilitas pembentukan HTML untuk cetak/PDF laporan resmi berkop EKASATRA.
 */
export async function exportReportToPrintableHtml(
  db: DbExecutor,
  title: string,
  filterInfo: Record<string, string>,
  headers: { key: string; label: string }[],
  data: Record<string, unknown>[],
): Promise<string> {
  const officeName = await getSetting<string>(
    db,
    'office_name',
    'EKASATRA Law & Policy Advisory',
  );
  const officeAddress = await getSetting<string>(db, 'office_address', '');
  const officePhone = await getSetting<string>(db, 'office_phone', '');

  const filterRows = Object.entries(filterInfo)
    .filter(([_, v]) => Boolean(v))
    .map(
      ([k, v]) =>
        `<span style="margin-right: 16px;"><strong>${k}:</strong> ${v}</span>`,
    )
    .join(' ');

  const thead = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #CBD5E1; padding: 8px 12px; background-color: #F1F5F9; font-weight: 600; font-size: 13px; text-align: left;">${h.label}</th>`,
    )
    .join('');

  const tbody = data
    .map(
      (row, idx) =>
        `<tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">` +
        headers
          .map(
            (h) =>
              `<td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px;">${row[h.key] ?? '-'}</td>`,
          )
          .join('') +
        '</tr>',
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${officeName}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; }
      @page { size: A4 landscape; margin: 10mm; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; margin: 24px;">
  <!-- Kop Surat Resmi -->
  <div style="border-bottom: 2px solid #1A2E44; padding-bottom: 12px; margin-bottom: 20px;">
    <h1 style="margin: 0; color: #1A2E44; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${officeName}</h1>
    ${officeAddress ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">${officeAddress}</p>` : ''}
    ${officePhone ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748B;">Telp: ${officePhone}</p>` : ''}
  </div>

  <!-- Judul Laporan -->
  <div style="margin-bottom: 16px;">
    <h2 style="margin: 0 0 8px 0; color: #1A2E44; font-size: 16px;">${title}</h2>
    ${filterRows ? `<div style="font-size: 12px; color: #475569; margin-bottom: 8px;">${filterRows}</div>` : ''}
    <div style="font-size: 11px; color: #94A3B8;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</div>
  </div>

  <!-- Tabel Data -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody || '<tr><td colspan="100" style="text-align: center; padding: 24px; color: #94A3B8;">Tidak ada data</td></tr>'}</tbody>
  </table>
</body>
</html>
`.trim();
}

