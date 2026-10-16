/**
 * Fungsi baca modul cases (Agent D · D7 + baca untuk modul lain).
 *
 * KUNCI (PRD §4): pembatasan "hanya perkara yang ditugaskan" diterapkan di SATU tempat —
 * `listVisibleCaseIds` / `getCaseForUser` — dan dipakai agen lain (E, F, G).
 * Jangan duplikasi aturan cakupan di tempat lain.
 *
 * Aturan cakupan (PRD §4 baris "Pembatasan baris"):
 * - Admin → semua perkara.
 * - non-Admin + `scope_assigned_only=false` → semua perkara.
 * - non-Admin + `scope_assigned_only=true` → hanya perkara yang (a) dibuat olehnya
 *   atau (b) ia menjadi anggota tim.
 */
import { and, count, desc, eq, gte, ilike, inArray, lte, notInArray, or, sql } from 'drizzle-orm';
import {
  cases,
  caseMembers,
  caseTimeline,
  caseSchedules,
  caseDocuments,
  clients,
  opponents,
  profiles,
} from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';
import { isAdminRole } from '../kernel/policy';
import type {
  CaseForUser,
  CaseTeamMember,
  CasesReportFilter,
  CasesReportItem,
  CaseProgressReport,
  SchedulesReportFilter,
  SchedulesReportItem,
  PortalCaseItem,
  PortalTimelineItem,
  PortalScheduleItem,
  PortalDocumentItem,
  DashboardScheduleItem,
  DashboardTenggatItem,
} from '@ekasatra/shared';
import { getSetting } from '../settings/read';

// ---------------------------------------------------------------------------
// D7 — Kontrak baca untuk modul lain (E, F, G). Satu-satunya titik cakupan.
// ---------------------------------------------------------------------------

/**
 * Daftar ID perkara yang terlihat oleh user. Mengembalikan `'all'` bila tidak
 * ada pembatasan (Admin atau `scope_assigned_only=false`), atau array ID bila
 * dibatasi. Bila `scopeAssignedOnly` tidak diberikan, dibaca dari settings.
 */
export async function listVisibleCaseIds(
  db: DbExecutor,
  userId: string,
  role: string,
  scopeAssignedOnly?: boolean,
): Promise<string[] | 'all'> {
  const normalized = role.toLowerCase();

  // Admin selalu melihat semua.
  if (isAdminRole(normalized)) return 'all';

  // Baca setting bila pemanggil tidak menyediakannya.
  const scope =
    scopeAssignedOnly ?? (await getSetting<boolean>(db, 'scope_assigned_only', true));

  if (!scope) return 'all';

  // (a) dibuat olehnya ATAU (b) anggota tim — gabung unik.
  const owned = db
    .select({ id: cases.id })
    .from(cases)
    .where(eq(cases.createdBy, userId));

  const member = db
    .select({ id: caseMembers.caseId })
    .from(caseMembers)
    .where(eq(caseMembers.userId, userId));

  const [ownedRows, memberRows] = await Promise.all([owned, member]);

  const ids = new Set<string>();
  for (const r of ownedRows) ids.add(r.id);
  for (const r of memberRows) ids.add(r.id);
  return [...ids];
}

/**
 * Ambil satu perkara bila terlihat oleh user, atau `null` bila tidak.
 * Ini adalah gerbang otorisasi baris untuk semua akses perkara modul lain.
 */
export async function getCaseForUser(
  db: DbExecutor,
  caseId: string,
  userId: string,
  role: string,
  scopeAssignedOnly?: boolean,
): Promise<CaseForUser | null> {
  const normalized = role.toLowerCase();
  const scope =
    scopeAssignedOnly ?? (await getSetting<boolean>(db, 'scope_assigned_only', true));

  const visible = isAdminRole(normalized) || !scope;

  // Bila visible (tidak dibatasi), ambil langsung.
  if (visible) {
    const rows = await db
      .select({
        id: cases.id,
        regNo: cases.regNo,
        title: cases.title,
        clientId: cases.clientId,
        status: cases.status,
        court: cases.court,
        caseNumber: cases.caseNumber,
      })
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);
    return rows[0] ?? null;
  }

  // Bila dibatasi: cek kepemilikan/keanggotaan + ambil data dalam satu query.
  const rows = await db
    .select({
      id: cases.id,
      regNo: cases.regNo,
      title: cases.title,
      clientId: cases.clientId,
      status: cases.status,
      court: cases.court,
      caseNumber: cases.caseNumber,
    })
    .from(cases)
    .where(
      and(
        eq(cases.id, caseId),
        or(
          eq(cases.createdBy, userId),
          inArray(
            cases.id,
            db
              .select({ id: caseMembers.caseId })
              .from(caseMembers)
              .where(eq(caseMembers.userId, userId)),
          ),
        ),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Daftar anggota tim perkara, urut `created_at` paling awal.
 * Dasar reviewer/signer surat Perkara (REQ-E2) dan distribusi honor (REQ-F1).
 */
export async function getCaseTeamMembers(
  db: DbExecutor,
  caseId: string,
): Promise<CaseTeamMember[]> {
  const rows = await db
    .select({
      userId: caseMembers.userId,
      peran: caseMembers.peran,
      fullName: profiles.fullName,
      createdAt: caseMembers.createdAt,
    })
    .from(caseMembers)
    .innerJoin(profiles, eq(caseMembers.userId, profiles.id))
    .where(eq(caseMembers.caseId, caseId))
    .orderBy(caseMembers.createdAt);

  return rows.map((r) => ({
    userId: r.userId,
    peran: r.peran,
    fullName: r.fullName,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Baca untuk Dashboard (G1, G6) & PRD §5.10.
// ---------------------------------------------------------------------------

/**
 * Ringkasan perkara untuk dashboard (PRD §5.10).
 */
export async function getCaseSummaryForDashboard(
  db: DbExecutor,
  options?: { userId?: string; role?: string; scopeAssignedOnly?: boolean },
): Promise<{
  activeCount: number;
  completedCount: number;
  byStatus: { status: string; count: number }[];
}> {
  const visibleIds =
    options?.userId && options?.role
      ? await listVisibleCaseIds(db, options.userId, options.role, options?.scopeAssignedOnly)
      : 'all';

  let query = db
    .select({
      status: cases.status,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(cases);

  if (visibleIds !== 'all') {
    if (visibleIds.length === 0) {
      return { activeCount: 0, completedCount: 0, byStatus: [] };
    }
    query = query.where(inArray(cases.id, visibleIds)) as typeof query;
  }

  const rows = await query.groupBy(cases.status);

  let activeCount = 0;
  let completedCount = 0;
  const byStatus: { status: string; count: number }[] = [];

  for (const r of rows) {
    byStatus.push({ status: r.status, count: r.count });
    if (r.status === 'Aktif') {
      activeCount += r.count;
    } else if (r.status === 'Selesai') {
      completedCount += r.count;
    }
  }

  return { activeCount, completedCount, byStatus };
}

/**
 * Jadwal sidang 7 hari ke depan untuk dashboard (PRD §5.10).
 */
export async function getUpcomingSchedulesForDashboard(
  db: DbExecutor,
  startDateStr: string,
  endDateStr: string,
  options?: { userId?: string; role?: string; scopeAssignedOnly?: boolean },
): Promise<DashboardScheduleItem[]> {
  const visibleIds =
    options?.userId && options?.role
      ? await listVisibleCaseIds(db, options.userId, options.role, options?.scopeAssignedOnly)
      : 'all';

  const conditions = [
    gte(caseSchedules.scheduleDate, startDateStr),
    lte(caseSchedules.scheduleDate, endDateStr),
    eq(caseSchedules.status, 'Terjadwal'),
  ];

  if (visibleIds !== 'all') {
    if (visibleIds.length === 0) return [];
    conditions.push(inArray(caseSchedules.caseId, visibleIds));
  }

  const rows = await db
    .select({
      id: caseSchedules.id,
      caseId: caseSchedules.caseId,
      caseTitle: cases.title,
      scheduleDate: caseSchedules.scheduleDate,
      scheduleTime: caseSchedules.scheduleTime,
      kind: caseSchedules.kind,
      location: caseSchedules.location,
      status: caseSchedules.status,
    })
    .from(caseSchedules)
    .innerJoin(cases, eq(caseSchedules.caseId, cases.id))
    .where(and(...conditions))
    .orderBy(caseSchedules.scheduleDate, caseSchedules.scheduleTime);

  return rows;
}

export type ScheduleCalendarItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseRegNo: string;
  scheduleDate: string;
  scheduleTime: string | null;
  kind: string;
  location: string | null;
  notes: string | null;
  status: string;
};

/**
 * Semua jadwal (apa pun statusnya) pada rentang tanggal, dibatasi perkara yang terlihat user.
 * Dipakai halaman Jadwal Sidang (kalender bulanan).
 */
export async function listSchedulesInRange(
  db: DbExecutor,
  user: { userId: string; role: string },
  from: string,
  to: string,
): Promise<ScheduleCalendarItem[]> {
  const visibleIds = await listVisibleCaseIds(db, user.userId, user.role);
  const conditions = [gte(caseSchedules.scheduleDate, from), lte(caseSchedules.scheduleDate, to)];
  if (visibleIds !== 'all') {
    if (visibleIds.length === 0) return [];
    conditions.push(inArray(caseSchedules.caseId, visibleIds));
  }
  return db
    .select({
      id: caseSchedules.id,
      caseId: caseSchedules.caseId,
      caseTitle: cases.title,
      caseRegNo: cases.regNo,
      scheduleDate: caseSchedules.scheduleDate,
      scheduleTime: caseSchedules.scheduleTime,
      kind: caseSchedules.kind,
      location: caseSchedules.location,
      notes: caseSchedules.notes,
      status: caseSchedules.status,
    })
    .from(caseSchedules)
    .innerJoin(cases, eq(caseSchedules.caseId, cases.id))
    .where(and(...conditions))
    .orderBy(caseSchedules.scheduleDate, caseSchedules.scheduleTime);
}

export type DocumentCatalogItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseRegNo: string;
  title: string;
  fileName: string | null;
  fileSize: number | null;
  sharedWithClient: boolean;
  uploadedByName: string | null;
  createdAt: Date;
};

/**
 * Dokumen semua perkara yang terlihat user (halaman Dokumen & Drive).
 * Pencarian memakai judul dokumen; `caseId` mempersempit ke satu perkara.
 */
export async function listDocumentCatalog(
  db: DbExecutor,
  user: { userId: string; role: string },
  opts: { q?: string; caseId?: string; limit?: number } = {},
): Promise<DocumentCatalogItem[]> {
  const visibleIds = await listVisibleCaseIds(db, user.userId, user.role);
  const conditions = [];
  if (visibleIds !== 'all') {
    if (visibleIds.length === 0) return [];
    conditions.push(inArray(caseDocuments.caseId, visibleIds));
  }
  if (opts.caseId) conditions.push(eq(caseDocuments.caseId, opts.caseId));
  if (opts.q) conditions.push(sql`${caseDocuments.title} ilike ${'%' + opts.q + '%'}`);
  return db
    .select({
      id: caseDocuments.id,
      caseId: caseDocuments.caseId,
      caseTitle: cases.title,
      caseRegNo: cases.regNo,
      title: caseDocuments.title,
      fileName: caseDocuments.fileName,
      fileSize: caseDocuments.fileSize,
      sharedWithClient: caseDocuments.sharedWithClient,
      uploadedByName: profiles.fullName,
      createdAt: caseDocuments.createdAt,
    })
    .from(caseDocuments)
    .innerJoin(cases, eq(caseDocuments.caseId, cases.id))
    .leftJoin(profiles, eq(caseDocuments.uploadedBy, profiles.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(caseDocuments.createdAt))
    .limit(opts.limit ?? 200);
}

export type CaseListItem = {
  id: string;
  regNo: string;
  title: string;
  status: string;
  caseType: string | null;
  court: string | null;
  clientName: string | null;
  opponentName: string | null;
  startDate: string | null;
  upayaDeadline: string | null;
  team: { userId: string; name: string; peran: string }[];
  next: { date: string; time: string | null; kind: string } | null;
};

/**
 * Daftar perkara untuk halaman Perkara: klien, pihak lawan, tim, dan agenda terdekat.
 * Cakupan baris sama dengan `listCases` (`listVisibleCaseIds`), termasuk total hitungan.
 * Filter: status, jenis perkara, anggota tim (`memberId`), dan pencarian judul/no. reg/pengadilan/klien.
 */
export async function listCasesDetailed(
  db: DbExecutor,
  user: { userId: string; role: string },
  opts: {
    page: number;
    pageSize: number;
    offset: number;
    q?: string;
    status?: string;
    caseType?: string;
    memberId?: string;
    today: string;
  },
): Promise<{ rows: CaseListItem[]; total: number }> {
  const visibleIds = await listVisibleCaseIds(db, user.userId, user.role);
  if (visibleIds !== 'all' && visibleIds.length === 0) return { rows: [], total: 0 };

  const conditions = [];
  if (visibleIds !== 'all') conditions.push(inArray(cases.id, visibleIds));
  if (opts.status) conditions.push(sql`${cases.status}::text = ${opts.status}`);
  if (opts.caseType) conditions.push(eq(cases.caseType, opts.caseType));
  if (opts.memberId) {
    conditions.push(
      inArray(
        cases.id,
        db
          .select({ id: caseMembers.caseId })
          .from(caseMembers)
          .where(eq(caseMembers.userId, opts.memberId)),
      ),
    );
  }
  if (opts.q) {
    const like = `%${opts.q}%`;
    conditions.push(
      or(
        ilike(cases.title, like),
        ilike(cases.regNo, like),
        ilike(cases.court, like),
        ilike(clients.name, like),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [base, countRows] = await Promise.all([
    db
      .select({
        id: cases.id,
        regNo: cases.regNo,
        title: cases.title,
        status: cases.status,
        caseType: cases.caseType,
        court: cases.court,
        clientName: clients.name,
        opponentName: opponents.name,
        startDate: cases.startDate,
        upayaDeadline: cases.upayaDeadline,
      })
      .from(cases)
      .leftJoin(clients, eq(cases.clientId, clients.id))
      .leftJoin(opponents, eq(cases.opponentId, opponents.id))
      .where(where)
      .orderBy(desc(cases.createdAt))
      .limit(opts.pageSize)
      .offset(opts.offset),
    db.select({ value: count() }).from(cases).leftJoin(clients, eq(cases.clientId, clients.id)).where(where),
  ]);

  const ids = base.map((r) => r.id);
  const [members, schedules] = ids.length
    ? await Promise.all([
        db
          .select({
            caseId: caseMembers.caseId,
            userId: caseMembers.userId,
            peran: caseMembers.peran,
            name: profiles.fullName,
          })
          .from(caseMembers)
          .innerJoin(profiles, eq(caseMembers.userId, profiles.id))
          .where(inArray(caseMembers.caseId, ids)),
        db
          .select({
            caseId: caseSchedules.caseId,
            date: caseSchedules.scheduleDate,
            time: caseSchedules.scheduleTime,
            kind: caseSchedules.kind,
          })
          .from(caseSchedules)
          .where(
            and(
              inArray(caseSchedules.caseId, ids),
              eq(caseSchedules.status, 'Terjadwal'),
              gte(caseSchedules.scheduleDate, opts.today),
            ),
          )
          .orderBy(caseSchedules.scheduleDate, caseSchedules.scheduleTime),
      ])
    : [[], []];

  const rows: CaseListItem[] = base.map((r) => {
    const sched = schedules.find((x) => x.caseId === r.id);
    return {
      ...r,
      team: members
        .filter((m) => m.caseId === r.id)
        .map((m) => ({ userId: m.userId, name: m.name, peran: m.peran })),
      next: sched ? { date: sched.date, time: sched.time, kind: sched.kind } : null,
    };
  });
  return { rows, total: countRows[0]?.value ?? 0 };
}

/**
 * Tenggat 14 hari: Upaya Hukum & Jadwal Sidang (PRD §5.10).
 */
export async function getTenggat14HariCases(
  db: DbExecutor,
  todayStr: string,
  deadline14Str: string,
  options?: { userId?: string; role?: string; scopeAssignedOnly?: boolean },
): Promise<DashboardTenggatItem[]> {
  const visibleIds =
    options?.userId && options?.role
      ? await listVisibleCaseIds(db, options.userId, options.role, options?.scopeAssignedOnly)
      : 'all';

  const items: DashboardTenggatItem[] = [];

  // 1. Upaya Hukum (perkara aktif dengan upayaDeadline antara hari ini s/d 14 hari ke depan)
  const upayaConditions = [
    gte(cases.upayaDeadline, todayStr),
    lte(cases.upayaDeadline, deadline14Str),
    eq(cases.status, 'Aktif'),
  ];

  if (visibleIds !== 'all') {
    if (visibleIds.length > 0) {
      upayaConditions.push(inArray(cases.id, visibleIds));
    }
  }

  if (visibleIds === 'all' || visibleIds.length > 0) {
    const upayaRows = await db
      .select({
        id: cases.id,
        title: cases.title,
        upayaDeadline: cases.upayaDeadline,
      })
      .from(cases)
      .where(and(...upayaConditions));

    const today = new Date(todayStr).getTime();
    for (const row of upayaRows) {
      if (!row.upayaDeadline) continue;
      const target = new Date(row.upayaDeadline).getTime();
      const daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      items.push({
        id: `upaya-${row.id}`,
        type: 'upaya_hukum',
        title: `Batas Upaya Hukum: ${row.title}`,
        targetDate: row.upayaDeadline,
        daysLeft,
        link: `/cases/${row.id}`,
      });
    }
  }

  // 2. Sidang 14 hari ke depan
  const upcomingSchedules = await getUpcomingSchedulesForDashboard(
    db,
    todayStr,
    deadline14Str,
    options,
  );
  const todayMs = new Date(todayStr).getTime();
  for (const s of upcomingSchedules) {
    const targetMs = new Date(s.scheduleDate).getTime();
    const daysLeft = Math.ceil((targetMs - todayMs) / (1000 * 60 * 60 * 24));
    items.push({
      id: `sidang-${s.id}`,
      type: 'sidang',
      title: `${s.kind}: ${s.caseTitle}`,
      targetDate: s.scheduleDate,
      daysLeft,
      extraInfo: s.location || undefined,
      link: `/cases/${s.caseId}`,
    });
  }

  // Urutkan berdasarkan targetDate terdekat
  items.sort((a, b) => a.daysLeft - b.daysLeft);
  return items;
}

// ---------------------------------------------------------------------------
// Baca untuk Laporan (G2) & PRD §5.11.
// ---------------------------------------------------------------------------

/**
 * Daftar perkara untuk Laporan Perkara (Admin) (PRD §5.11).
 */
export async function listCasesForReport(
  db: DbExecutor,
  filter?: CasesReportFilter,
): Promise<CasesReportItem[]> {
  const conditions = [];

  if (filter?.startDate) {
    conditions.push(gte(cases.startDate, filter.startDate));
  }
  if (filter?.endDate) {
    conditions.push(lte(cases.startDate, filter.endDate));
  }
  if (filter?.status) {
    conditions.push(eq(cases.status, filter.status as (typeof cases.status.enumValues)[number]));
  }
  if (filter?.clientId) {
    conditions.push(eq(cases.clientId, filter.clientId));
  }

  const query = db
    .select({
      id: cases.id,
      regNo: cases.regNo,
      title: cases.title,
      clientName: clients.name,
      court: cases.court,
      caseNumber: cases.caseNumber,
      status: cases.status,
      startDate: cases.startDate,
      putusDate: cases.putusDate,
      upayaDeadline: cases.upayaDeadline,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = whereClause
    ? await query.where(whereClause).orderBy(desc(cases.createdAt))
    : await query.orderBy(desc(cases.createdAt));

  return rows;
}

/**
 * Daftar jadwal untuk Laporan Jadwal (Admin) (PRD §5.11).
 */
export async function listSchedulesForReport(
  db: DbExecutor,
  filter?: SchedulesReportFilter,
): Promise<SchedulesReportItem[]> {
  const conditions = [];

  if (filter?.startDate) {
    conditions.push(gte(caseSchedules.scheduleDate, filter.startDate));
  }
  if (filter?.endDate) {
    conditions.push(lte(caseSchedules.scheduleDate, filter.endDate));
  }
  if (filter?.status) {
    conditions.push(eq(caseSchedules.status, filter.status));
  }
  if (filter?.kind) {
    conditions.push(eq(caseSchedules.kind, filter.kind));
  }
  if (filter?.caseId) {
    conditions.push(eq(caseSchedules.caseId, filter.caseId));
  }

  const query = db
    .select({
      id: caseSchedules.id,
      scheduleDate: caseSchedules.scheduleDate,
      scheduleTime: caseSchedules.scheduleTime,
      kind: caseSchedules.kind,
      caseTitle: cases.title,
      location: caseSchedules.location,
      notes: caseSchedules.notes,
      status: caseSchedules.status,
    })
    .from(caseSchedules)
    .innerJoin(cases, eq(caseSchedules.caseId, cases.id));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return whereClause
    ? query.where(whereClause).orderBy(desc(caseSchedules.scheduleDate))
    : query.orderBy(desc(caseSchedules.scheduleDate));
}

/**
 * Export progres satu perkara (PRD §5.11).
 */
export async function getCaseProgressForReport(
  db: DbExecutor,
  caseId: string,
): Promise<CaseProgressReport | null> {
  const caseRows = await db
    .select({
      id: cases.id,
      regNo: cases.regNo,
      title: cases.title,
      clientName: clients.name,
      court: cases.court,
      caseNumber: cases.caseNumber,
      status: cases.status,
      startDate: cases.startDate,
      putusDate: cases.putusDate,
      upayaDeadline: cases.upayaDeadline,
      description: cases.description,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .where(eq(cases.id, caseId))
    .limit(1);

  if (!caseRows[0]) return null;

  const timelineRows = await db
    .select({
      eventDate: caseTimeline.eventDate,
      eventType: caseTimeline.eventType,
      title: caseTimeline.title,
      description: caseTimeline.description,
    })
    .from(caseTimeline)
    .where(eq(caseTimeline.caseId, caseId))
    .orderBy(desc(caseTimeline.eventDate));

  const scheduleRows = await db
    .select({
      scheduleDate: caseSchedules.scheduleDate,
      scheduleTime: caseSchedules.scheduleTime,
      kind: caseSchedules.kind,
      location: caseSchedules.location,
      status: caseSchedules.status,
    })
    .from(caseSchedules)
    .where(eq(caseSchedules.caseId, caseId))
    .orderBy(desc(caseSchedules.scheduleDate));

  return {
    caseInfo: caseRows[0],
    timeline: timelineRows,
    schedules: scheduleRows,
  };
}

// ---------------------------------------------------------------------------
// Baca untuk Portal Klien (G3) & PRD §5.12.
// ---------------------------------------------------------------------------

/**
 * Data Portal Klien: Daftar perkara milik klien (PRD §5.12).
 */
export async function getClientCasesForPortal(
  db: DbExecutor,
  clientId: string,
): Promise<PortalCaseItem[]> {
  return db
    .select({
      id: cases.id,
      regNo: cases.regNo,
      title: cases.title,
      court: cases.court,
      caseNumber: cases.caseNumber,
      caseType: cases.caseType,
      status: cases.status,
      startDate: cases.startDate,
      putusDate: cases.putusDate,
    })
    .from(cases)
    .where(eq(cases.clientId, clientId))
    .orderBy(desc(cases.createdAt));
}

/**
 * Data Portal Klien: Timeline perkara milik klien (PRD §5.12).
 * ATURAN KETAT: Tanpa tipe 'Catatan', 'Dokumen', 'Surat'!
 */
export async function getClientTimelineForPortal(
  db: DbExecutor,
  clientId: string,
): Promise<PortalTimelineItem[]> {
  const rows = await db
    .select({
      id: caseTimeline.id,
      caseId: caseTimeline.caseId,
      caseTitle: cases.title,
      eventDate: caseTimeline.eventDate,
      eventType: caseTimeline.eventType,
      title: caseTimeline.title,
      description: caseTimeline.description,
    })
    .from(caseTimeline)
    .innerJoin(cases, eq(caseTimeline.caseId, cases.id))
    .where(
      and(
        eq(cases.clientId, clientId),
        notInArray(caseTimeline.eventType, ['Catatan', 'Dokumen', 'Surat']),
      ),
    )
    .orderBy(desc(caseTimeline.eventDate));

  return rows;
}

/**
 * Data Portal Klien: Jadwal perkara milik klien (PRD §5.12).
 */
export async function getClientSchedulesForPortal(
  db: DbExecutor,
  clientId: string,
): Promise<PortalScheduleItem[]> {
  return db
    .select({
      id: caseSchedules.id,
      caseId: caseSchedules.caseId,
      caseTitle: cases.title,
      scheduleDate: caseSchedules.scheduleDate,
      scheduleTime: caseSchedules.scheduleTime,
      kind: caseSchedules.kind,
      location: caseSchedules.location,
      status: caseSchedules.status,
    })
    .from(caseSchedules)
    .innerJoin(cases, eq(caseSchedules.caseId, cases.id))
    .where(eq(cases.clientId, clientId))
    .orderBy(desc(caseSchedules.scheduleDate));
}

/**
 * Data Portal Klien: Dokumen perkara yang dibagikan ke klien (PRD §5.12).
 * ATURAN KETAT: Hanya dokumen dengan `shared_with_client = true`!
 */
export async function getClientDocumentsForPortal(
  db: DbExecutor,
  clientId: string,
): Promise<PortalDocumentItem[]> {
  const rows = await db
    .select({
      id: caseDocuments.id,
      caseId: caseDocuments.caseId,
      caseTitle: cases.title,
      title: caseDocuments.title,
      fileName: caseDocuments.fileName,
      fileSize: caseDocuments.fileSize,
      mimeType: caseDocuments.mimeType,
      createdAt: sql<string>`cast(${caseDocuments.createdAt} as text)`,
    })
    .from(caseDocuments)
    .innerJoin(cases, eq(caseDocuments.caseId, cases.id))
    .where(and(eq(cases.clientId, clientId), eq(caseDocuments.sharedWithClient, true)))
    .orderBy(desc(caseDocuments.createdAt));

  return rows;
}

/**
 * Verifikasi kepemilikan file oleh klien sebelum pengunduhan (PRD §5.12).
 * Dokumen harus:
 * 1. Berada di perkara milik clientId tersebut
 * 2. Memiliki `sharedWithClient = true`
 */
export async function verifyClientDocumentOwnership(
  db: DbExecutor,
  clientId: string,
  documentId: string,
): Promise<{
  verified: boolean;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
}> {
  const rows = await db
    .select({
      filePath: caseDocuments.filePath,
      fileName: caseDocuments.fileName,
      mimeType: caseDocuments.mimeType,
      sharedWithClient: caseDocuments.sharedWithClient,
      clientId: cases.clientId,
    })
    .from(caseDocuments)
    .innerJoin(cases, eq(caseDocuments.caseId, cases.id))
    .where(and(eq(caseDocuments.id, documentId), eq(cases.clientId, clientId)))
    .limit(1);

  if (rows.length === 0 || !rows[0]) {
    return { verified: false };
  }

  const doc = rows[0];
  if (!doc.sharedWithClient || !doc.filePath) {
    return { verified: false };
  }

  return {
    verified: true,
    filePath: doc.filePath,
    fileName: doc.fileName ?? undefined,
    mimeType: doc.mimeType ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Baca untuk Cron pengingat (G5) & PRD §5.13.
// ---------------------------------------------------------------------------

/**
 * Baca jadwal sidang pada targetDate untuk pengingat cron (G5 / PRD §5.13).
 * Mengembalikan daftar jadwal dan user ID seluruh anggota tim perkara terkait.
 */
export async function getHearingRemindersForDate(
  db: DbExecutor,
  targetDateStr: string,
): Promise<
  {
    scheduleId: string;
    caseId: string;
    caseTitle: string;
    scheduleDate: string;
    scheduleTime?: string | null;
    location?: string | null;
    memberUserIds: string[];
  }[]
> {
  const scheduleRows = await db
    .select({
      scheduleId: caseSchedules.id,
      caseId: caseSchedules.caseId,
      caseTitle: cases.title,
      scheduleDate: caseSchedules.scheduleDate,
      scheduleTime: caseSchedules.scheduleTime,
      location: caseSchedules.location,
    })
    .from(caseSchedules)
    .innerJoin(cases, eq(caseSchedules.caseId, cases.id))
    .where(
      and(
        eq(caseSchedules.scheduleDate, targetDateStr),
        eq(caseSchedules.status, 'Terjadwal'),
        eq(cases.status, 'Aktif'),
      ),
    );

  const results = [];
  for (const s of scheduleRows) {
    const members = await db
      .select({ userId: caseMembers.userId })
      .from(caseMembers)
      .where(eq(caseMembers.caseId, s.caseId));
    results.push({
      ...s,
      memberUserIds: members.map((m) => m.userId),
    });
  }

  return results;
}

/**
 * Baca perkara aktif dengan batas upaya hukum <= maxDays untuk pengingat cron (G5 / PRD §5.13).
 * Mengembalikan user ID advokat dan manager perkara.
 */
export async function getUpayaDeadlineReminders(
  db: DbExecutor,
  todayStr: string,
  maxTargetDateStr: string,
): Promise<
  {
    caseId: string;
    caseTitle: string;
    deadlineDate: string;
    advocateAndManagerUserIds: string[];
  }[]
> {
  const caseRows = await db
    .select({
      caseId: cases.id,
      caseTitle: cases.title,
      deadlineDate: cases.upayaDeadline,
    })
    .from(cases)
    .where(
      and(
        gte(cases.upayaDeadline, todayStr),
        lte(cases.upayaDeadline, maxTargetDateStr),
        eq(cases.status, 'Aktif'),
      ),
    );

  const results = [];
  for (const c of caseRows) {
    if (!c.deadlineDate) continue;
    const members = await db
      .select({ userId: caseMembers.userId, peran: caseMembers.peran })
      .from(caseMembers)
      .where(
        and(
          eq(caseMembers.caseId, c.caseId),
          inArray(caseMembers.peran, ['Advokat', 'Manager']),
        ),
      );
    results.push({
      caseId: c.caseId,
      caseTitle: c.caseTitle,
      deadlineDate: c.deadlineDate,
      advocateAndManagerUserIds: [...new Set(members.map((m) => m.userId))],
    });
  }

  return results;
}
