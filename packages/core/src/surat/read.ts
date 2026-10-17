import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { suratMasuk, suratKeluar, suratApprovalLogs, cases, profiles } from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';
import type {
  SuratMasukReportFilter,
  SuratMasukReportItem,
  SuratKeluarReportFilter,
  SuratKeluarReportItem,
  PortalSuratMasukItem,
  DashboardApprovalItem,
  PersonalNotificationItem,
} from '@ekasatra/shared';

/**
 * Ringkasan surat masuk & keluar hari ini dan surat belum selesai (PRD §5.10).
 */
export async function getSuratSummaryForDashboard(
  db: DbExecutor,
  todayStr: string,
): Promise<{
  masukHariIni: number;
  keluarHariIni: number;
  masukBelumSelesai: number;
}> {
  // Tiga hitungan independen dijalankan paralel (hemat RTT saat jauh dari DB).
  const [smHariIni, smBelumSelesai, skHariIni] = await Promise.all([
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(suratMasuk)
      .where(eq(suratMasuk.tglTerima, todayStr)),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(suratMasuk)
      .where(inArray(suratMasuk.status, ['Belum', 'Didisposisi'])),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(suratKeluar)
      .where(eq(suratKeluar.tglSurat, todayStr)),
  ]);

  return {
    masukHariIni: smHariIni[0]?.count ?? 0,
    keluarHariIni: skHariIni[0]?.count ?? 0,
    masukBelumSelesai: smBelumSelesai[0]?.count ?? 0,
  };
}

/** Tanggal terakhir (angka, 2 digit) untuk tahun-bulan berbasis 0 (0 = Januari). */
function lastDayOfMonth(year: number, monthIndex: number): string {
  return String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, '0');
}

/**
 * Tren surat 6 bulan terakhir untuk grafik Recharts / SVG (PRD §5.10).
 */
export async function getSuratTrend6Bulan(
  db: DbExecutor,
): Promise<{ month: string; suratMasuk: number; suratKeluar: number }[]> {
  const now = new Date();
  const months: { label: string; start: string; end: string }[] = [];

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    const label = `${monthNames[d.getMonth()]} ${year}`;

    months.push({
      label,
      start: `${monthKey}-01`,
      end: `${monthKey}-${lastDayOfMonth(year, d.getMonth())}`,
    });
  }

  // Dua query agregasi GROUP BY menggantikan 12 query berurutan (hemat ~10 RTT).
  const [smRows, skRows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(${suratMasuk.tglTerima}, 'YYYY-MM')`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(suratMasuk)
      .where(
        and(
          gte(suratMasuk.tglTerima, months[0]!.start),
          lte(suratMasuk.tglTerima, months[months.length - 1]!.end),
        ),
      )
      .groupBy(sql`to_char(${suratMasuk.tglTerima}, 'YYYY-MM')`),
    db
      .select({
        month: sql<string>`to_char(${suratKeluar.tglSurat}, 'YYYY-MM')`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(suratKeluar)
      .where(
        and(
          gte(suratKeluar.tglSurat, months[0]!.start),
          lte(suratKeluar.tglSurat, months[months.length - 1]!.end),
        ),
      )
      .groupBy(sql`to_char(${suratKeluar.tglSurat}, 'YYYY-MM')`),
  ]);

  const smByMonth = new Map(smRows.map((r) => [r.month, r.count]));
  const skByMonth = new Map(skRows.map((r) => [r.month, r.count]));

  return months.map((m) => {
    const monthKey = m.start.slice(0, 7);
    return {
      month: m.label,
      suratMasuk: smByMonth.get(monthKey) ?? 0,
      suratKeluar: skByMonth.get(monthKey) ?? 0,
    };
  });
}

/**
 * Approval surat keluar yang menunggu user saat ini (PRD §5.10 & G6).
 * Reviewer: status 'Review' & reviewerId = userId
 * Signer: status 'Siap_TTD' & signerId = userId
 */
export async function getApprovalMenungguSaya(
  db: DbExecutor,
  userId: string,
): Promise<{ count: number; items: DashboardApprovalItem[] }> {
  const rows = await db
    .select({
      id: suratKeluar.id,
      perihal: suratKeluar.perihal,
      noSurat: suratKeluar.noSurat,
      status: suratKeluar.status,
      tglSurat: suratKeluar.tglSurat,
    })
    .from(suratKeluar)
    .where(
      sql`(${suratKeluar.status} = 'Review' and ${suratKeluar.reviewerId} = ${userId}) or (${suratKeluar.status} = 'Siap_TTD' and ${suratKeluar.signerId} = ${userId})`,
    )
    .orderBy(desc(suratKeluar.createdAt));

  return {
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      subject: r.perihal,
      noSurat: r.noSurat,
      status: r.status,
      tglSurat: r.tglSurat,
    })),
  };
}

/**
 * Notifikasi personal terkait surat (disposisi surat masuk, reject) (G6 / PRD §5.10).
 */
export async function getSuratPersonalNotifications(
  db: DbExecutor,
  userId: string,
  preloadedApproval?: { count: number; items: DashboardApprovalItem[] },
): Promise<PersonalNotificationItem[]> {
  const notifs: PersonalNotificationItem[] = [];

  // 1. Approval menunggu saya (boleh dilewatkan pemanggil agar tidak query ulang)
  const { items: pendingApprovals } =
    preloadedApproval ?? (await getApprovalMenungguSaya(db, userId));
  for (const item of pendingApprovals) {
    notifs.push({
      id: `approval-${item.id}`,
      type: 'approval',
      title: `Menunggu Persetujuan Anda: ${item.subject}`,
      description: `Surat keluar ${item.noSurat || '(Draft)'} berstatus ${item.status}`,
      date: item.tglSurat || new Date().toISOString().slice(0, 10),
      link: `/surat-keluar/${item.id}`,
      urgency: 'high',
    });
  }

  // 2. Disposisi surat masuk belum selesai untuk saya (status 'Belum')
  const disposisiRows = await db
    .select({
      id: suratMasuk.id,
      noAgenda: suratMasuk.noAgenda,
      subject: suratMasuk.subject,
      sender: suratMasuk.sender,
      tglTerima: suratMasuk.tglTerima,
      disposisiNote: suratMasuk.disposisiNote,
    })
    .from(suratMasuk)
    .where(and(eq(suratMasuk.assignedTo, userId), eq(suratMasuk.status, 'Belum')))
    .orderBy(desc(suratMasuk.tglTerima))
    .limit(10);

  for (const item of disposisiRows) {
    notifs.push({
      id: `disposisi-${item.id}`,
      type: 'disposisi',
      title: `Disposisi Surat Masuk: ${item.subject}`,
      description: `Dari ${item.sender} (${item.noAgenda})${item.disposisiNote ? ` — ${item.disposisiNote}` : ''}`,
      date: item.tglTerima,
      link: `/surat-masuk/${item.id}`,
      urgency: 'medium',
    });
  }

  // 3. Surat keluar buatan user yang baru saja ditolak (action 'Reject' pada suratApprovalLogs)
  const rejectedLogs = await db
    .select({
      id: suratKeluar.id,
      noSurat: suratKeluar.noSurat,
      perihal: suratKeluar.perihal,
      tglSurat: suratKeluar.tglSurat,
      note: suratApprovalLogs.note,
    })
    .from(suratApprovalLogs)
    .innerJoin(suratKeluar, eq(suratApprovalLogs.suratId, suratKeluar.id))
    .where(and(eq(suratApprovalLogs.action, 'Reject'), eq(suratKeluar.createdBy, userId)))
    .orderBy(desc(suratApprovalLogs.createdAt))
    .limit(5);

  for (const item of rejectedLogs) {
    notifs.push({
      id: `reject-${item.id}`,
      type: 'reject',
      title: `Surat Keluar Ditolak: ${item.perihal}`,
      description: `Surat ${item.noSurat || ''} ditolak. Catatan: ${item.note || 'Perlu perbaikan.'}`,
      date: item.tglSurat || new Date().toISOString().slice(0, 10),
      link: `/surat-keluar/${item.id}`,
      urgency: 'high',
    });
  }

  return notifs;
}

/**
 * Daftar surat masuk untuk Laporan Surat Masuk (Admin) (PRD §5.11).
 */
export async function listSuratMasukForReport(
  db: DbExecutor,
  filter?: SuratMasukReportFilter,
): Promise<SuratMasukReportItem[]> {
  const conditions = [];

  if (filter?.startDate) {
    conditions.push(gte(suratMasuk.tglTerima, filter.startDate));
  }
  if (filter?.endDate) {
    conditions.push(lte(suratMasuk.tglTerima, filter.endDate));
  }
  if (filter?.status) {
    conditions.push(
      eq(suratMasuk.status, filter.status as (typeof suratMasuk.status.enumValues)[number]),
    );
  }
  if (filter?.sifat) {
    conditions.push(eq(suratMasuk.sifat, filter.sifat));
  }
  if (filter?.caseId) {
    conditions.push(eq(suratMasuk.caseId, filter.caseId));
  }

  const query = db
    .select({
      id: suratMasuk.id,
      noAgenda: suratMasuk.noAgenda,
      noSurat: suratMasuk.noSurat,
      sender: suratMasuk.sender,
      subject: suratMasuk.subject,
      tglSurat: suratMasuk.tglSurat,
      tglTerima: suratMasuk.tglTerima,
      sifat: suratMasuk.sifat,
      status: suratMasuk.status,
      assignedToName: profiles.fullName,
      caseTitle: cases.title,
    })
    .from(suratMasuk)
    .leftJoin(profiles, eq(suratMasuk.assignedTo, profiles.id))
    .leftJoin(cases, eq(suratMasuk.caseId, cases.id));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return whereClause
    ? query.where(whereClause).orderBy(desc(suratMasuk.tglTerima))
    : query.orderBy(desc(suratMasuk.tglTerima));
}

/**
 * Daftar surat keluar untuk Laporan Surat Keluar (Admin) (PRD §5.11).
 */
export async function listSuratKeluarForReport(
  db: DbExecutor,
  filter?: SuratKeluarReportFilter,
): Promise<SuratKeluarReportItem[]> {
  const conditions = [];

  if (filter?.startDate) {
    conditions.push(gte(suratKeluar.tglSurat, filter.startDate));
  }
  if (filter?.endDate) {
    conditions.push(lte(suratKeluar.tglSurat, filter.endDate));
  }
  if (filter?.status) {
    conditions.push(
      eq(suratKeluar.status, filter.status as (typeof suratKeluar.status.enumValues)[number]),
    );
  }
  if (filter?.jenis) {
    conditions.push(
      eq(suratKeluar.jenis, filter.jenis as (typeof suratKeluar.jenis.enumValues)[number]),
    );
  }
  if (filter?.caseId) {
    conditions.push(eq(suratKeluar.caseId, filter.caseId));
  }

  const query = db
    .select({
      id: suratKeluar.id,
      noSurat: suratKeluar.noSurat,
      subject: suratKeluar.perihal,
      destination: suratKeluar.kepada,
      jenis: suratKeluar.jenis,
      tglSurat: suratKeluar.tglSurat,
      status: suratKeluar.status,
      creatorName: sql<
        string | null
      >`(select full_name from profiles where id = ${suratKeluar.createdBy})`,
      reviewerName: sql<
        string | null
      >`(select full_name from profiles where id = ${suratKeluar.reviewerId})`,
      signerName: sql<
        string | null
      >`(select full_name from profiles where id = ${suratKeluar.signerId})`,
      caseTitle: cases.title,
    })
    .from(suratKeluar)
    .leftJoin(cases, eq(suratKeluar.caseId, cases.id));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return whereClause
    ? query.where(whereClause).orderBy(desc(suratKeluar.createdAt))
    : query.orderBy(desc(suratKeluar.createdAt));
}

/**
 * Surat masuk terkait perkara klien untuk Portal Klien (PRD §5.12).
 */
export async function getClientSuratMasukForPortal(
  db: DbExecutor,
  clientId: string,
): Promise<PortalSuratMasukItem[]> {
  const rows = await db
    .select({
      id: suratMasuk.id,
      caseId: cases.id,
      caseTitle: cases.title,
      noAgenda: suratMasuk.noAgenda,
      sender: suratMasuk.sender,
      subject: suratMasuk.subject,
      tglTerima: suratMasuk.tglTerima,
    })
    .from(suratMasuk)
    .innerJoin(cases, eq(suratMasuk.caseId, cases.id))
    .where(eq(cases.clientId, clientId))
    .orderBy(desc(suratMasuk.tglTerima));

  return rows;
}
