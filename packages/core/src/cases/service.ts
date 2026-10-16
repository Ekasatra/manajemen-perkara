/**
 * Service modul cases (Agent D · D1, D2, D4).
 * CRUD perkara + tim + timeline + jadwal + dokumen.
 * Otorisasi tabel via `ensureCan` kernel; pembatasan baris via `getCaseForUser`/`listVisibleCaseIds`.
 */
import { and, count, desc, eq, ilike, inArray } from 'drizzle-orm';
import {
  cases,
  caseMembers,
  caseTimeline,
  caseSchedules,
  caseDocuments,
} from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';
import {
  notFound,
  badRequest,
  conflict,
  type CreateCaseInput,
  type UpdateCaseInput,
  type CreateCaseMemberInput,
  type CreateTimelineInput,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type UpdateDocumentInput,
  type CaseStatus,
} from '@ekasatra/shared';
import { withTx, nextCounter } from '../kernel/db-helpers';
import { logActivity } from '../kernel/activity';
import type { AuthContext } from '../kernel/auth';
import { getCaseForUser, getCaseTeamMembers, listVisibleCaseIds } from './read';
import { applyStatusChange } from './status';
import { getSetting } from '../settings/read';
import type { Db } from '@ekasatra/db';

// --- D1: CRUD Perkara ---

/** Buat perkara baru: penomoran REG/{tahun}/ atomik + pembuat Advokat auto-join tim. */
export async function createCase(
  db: Db,
  user: AuthContext,
  input: CreateCaseInput,
): Promise<typeof cases.$inferSelect> {
  const year = new Date().getFullYear();
  const counterKey = `REG/${year}`;

  const [caseRow] = await withTx(db, async (tx) => {
    const n = await nextCounter(tx, counterKey);
    const regNo = `REG/${year}/${String(n).padStart(4, '0')}`;

    const [row] = await tx
      .insert(cases)
      .values({
        regNo,
        title: input.title,
        clientId: input.clientId,
        opponentId: input.opponentId ?? null,
        caseNumber: input.caseNumber ?? null,
        court: input.court ?? null,
        caseType: input.caseType ?? null,
        description: input.description ?? null,
        startDate: input.startDate ?? null,
        createdBy: user.userId,
      })
      .returning();

    if (!row) throw new Error('Gagal membuat perkara');

    // PRD §5.4: Advokat yang membuat perkara otomatis menjadi advokat perkara itu.
    if (user.role === 'advokat') {
      await tx.insert(caseMembers).values({
        caseId: row.id,
        userId: user.userId,
        peran: 'Advokat',
      });
    }

    // Entri timeline awal.
    await tx.insert(caseTimeline).values({
      caseId: row.id,
      eventType: 'Status',
      title: 'Perkara dibuat',
      description: `Perkara ${regNo} didaftarkan oleh ${user.fullName}.`,
      createdBy: user.userId,
    });

    return [row];
  });

  if (!caseRow) throw new Error('Gagal membuat perkara');

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'create',
    module: 'cases',
    entityType: 'case',
    entityId: caseRow.id,
    description: `Buat perkara ${caseRow.title} (${caseRow.regNo})`,
  });

  return caseRow;
}

/** Daftar perkara yang terlihat user (paginasi server). */
export async function listCases(
  db: DbExecutor,
  user: AuthContext,
  opts: { page: number; pageSize: number; offset: number; q?: string },
): Promise<{
  rows: {
    id: string;
    regNo: string;
    title: string;
    clientId: string;
    status: CaseStatus;
    startDate: string | null;
    putusDate: string | null;
    upayaDeadline: string | null;
    createdAt: Date;
  }[];
  total: number;
}> {
  const visibleIds = await listVisibleCaseIds(db, user.userId, user.role);

  // Bila dibatasi dan kosong → tidak ada perkara terlihat.
  if (visibleIds !== 'all' && visibleIds.length === 0) {
    return { rows: [], total: 0 };
  }

  const conditions = [];
  if (opts.q) conditions.push(ilike(cases.title, `%${opts.q}%`));
  if (visibleIds !== 'all') conditions.push(inArray(cases.id, visibleIds));

  const baseQuery = db.select({
    id: cases.id,
    regNo: cases.regNo,
    title: cases.title,
    clientId: cases.clientId,
    status: cases.status,
    startDate: cases.startDate,
    putusDate: cases.putusDate,
    upayaDeadline: cases.upayaDeadline,
    createdAt: cases.createdAt,
  }).from(cases);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Total memakai filter yang sama: user terbatas tak boleh tahu jumlah perkara kantor.
  const [rows, countRows] = await Promise.all([
    baseQuery.where(where).orderBy(desc(cases.createdAt)).limit(opts.pageSize).offset(opts.offset),
    db.select({ value: count() }).from(cases).where(where),
  ]);

  return { rows, total: countRows[0]?.value ?? 0 };
}

// Helper tidak dipakai lagi — dihapus.

/** Ambil perkara bila terlihat user, lempar NOT_FOUND bila tidak. */
export async function requireVisibleCase(
  db: DbExecutor,
  user: AuthContext,
  caseId: string,
) {
  const scope = await getSetting<boolean>(db, 'scope_assigned_only', true);
  const row = await getCaseForUser(db, caseId, user.userId, user.role, scope);
  if (!row) throw notFound('Perkara tidak ditemukan');
  return row;
}

/** Detail lengkap perkara (untuk halaman detail). */
export async function getCaseDetail(db: DbExecutor, user: AuthContext, caseId: string) {
  await requireVisibleCase(db, user, caseId);
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!row) throw notFound('Perkara tidak ditemukan');
  return row;
}

/** Update perkara. */
export async function updateCase(
  db: Db,
  user: AuthContext,
  caseId: string,
  input: UpdateCaseInput,
): Promise<typeof cases.$inferSelect> {
  await requireVisibleCase(db, user, caseId);

  const [updated] = await db
    .update(cases)
    .set(input)
    .where(eq(cases.id, caseId))
    .returning();
  if (!updated) throw notFound('Perkara tidak ditemukan');

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'update',
    module: 'cases',
    entityType: 'case',
    entityId: caseId,
    description: `Update perkara ${updated.title} (${updated.regNo})`,
  });

  return updated;
}

/** Hapus perkara. Ditolak bila ada invoice/surat keluar terkait (RESTRICT DB). */
export async function deleteCase(
  db: Db,
  user: AuthContext,
  caseId: string,
): Promise<void> {
  await requireVisibleCase(db, user, caseId);

  const [target] = await db
    .select({ title: cases.title, regNo: cases.regNo })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  if (!target) throw notFound('Perkara tidak ditemukan');

  try {
    await db.delete(cases).where(eq(cases.id, caseId));
  } catch {
    // RESTRICT: ada invoice / surat keluar yang masih merujuk perkara.
    throw conflict(
      'Perkara tidak dapat dihapus karena masih memiliki invoice atau surat keluar terkait.',
    );
  }

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'delete',
    module: 'cases',
    entityType: 'case',
    entityId: caseId,
    description: `Hapus perkara ${target.title} (${target.regNo})`,
  });
}

// --- D3: Perubahan status ---

/** Ubah status perkara + set tanggal putus/upaya_deadline + entri timeline otomatis. */
export async function changeCaseStatus(
  db: Db,
  user: AuthContext,
  caseId: string,
  newStatus: CaseStatus,
): Promise<typeof cases.$inferSelect> {
  const bandingDays = await getSetting<number>(db, 'banding_deadline_days', 14);
  const today = todayWib();

  const [updated] = await withTx(db, async (tx) => {
    const [current] = await tx
      .select()
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);
    if (!current) throw notFound('Perkara tidak ditemukan');

    if (current.status === newStatus) {
      throw badRequest(`Status perkara sudah ${newStatus}`);
    }

    const { caseUpdate, timelineEntry } = applyStatusChange({
      current: {
        status: current.status,
        putusDate: current.putusDate,
        upayaDeadline: current.upayaDeadline,
        closedDate: current.closedDate,
      },
      newStatus,
      bandingDeadlineDays: bandingDays,
      today,
    });

    const [row] = await tx
      .update(cases)
      .set(caseUpdate)
      .where(eq(cases.id, caseId))
      .returning();

    await tx.insert(caseTimeline).values({
      caseId,
      eventType: timelineEntry.eventType,
      eventDate: timelineEntry.eventDate,
      title: timelineEntry.title,
      description: timelineEntry.description,
      createdBy: user.userId,
    });

    return [row];
  });

  if (!updated) throw notFound('Perkara tidak ditemukan');

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'update_status',
    module: 'cases',
    entityType: 'case',
    entityId: caseId,
    description: `Status perkara ${updated.title} diubah ke ${newStatus}`,
    metadata: { newStatus, bandingDeadlineDays: bandingDays },
  });

  return updated;
}

// --- D2: Tim perkara ---

export async function listMembers(db: DbExecutor, user: AuthContext, caseId: string) {
  await requireVisibleCase(db, user, caseId);
  return getCaseTeamMembers(db, caseId);
}

/** Tambah anggota tim. Hanya Admin (PRD §5.4). */
export async function addMember(
  db: Db,
  user: AuthContext,
  caseId: string,
  input: CreateCaseMemberInput,
): Promise<void> {
  await requireVisibleCase(db, user, caseId);

  // Validasi: maksimal satu Manager per perkara (constraint DB).
  if (input.peran === 'Manager') {
    const existing = await db
      .select({ userId: caseMembers.userId })
      .from(caseMembers)
      .where(and(eq(caseMembers.caseId, caseId), eq(caseMembers.peran, 'Manager')))
      .limit(1);
    const existingManager = existing[0];
    if (existingManager && existingManager.userId !== input.userId) {
      throw conflict('Perkara ini sudah memiliki seorang Manager.');
    }
  }

  try {
    await db.insert(caseMembers).values({
      caseId,
      userId: input.userId,
      peran: input.peran,
    });
  } catch {
    // PK gabungan: user sudah jadi anggota dengan peran ini.
    throw conflict('User ini sudah terdaftar sebagai anggota dengan peran tersebut.');
  }

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'add_member',
    module: 'cases',
    entityType: 'case',
    entityId: caseId,
    description: `Tambah anggota tim (${input.peran})`,
    metadata: { memberUserId: input.userId, peran: input.peran },
  });
}

/** Hapus anggota tim. Hanya Admin. */
export async function removeMember(
  db: Db,
  user: AuthContext,
  caseId: string,
  userId: string,
  peran: string,
): Promise<void> {
  await requireVisibleCase(db, user, caseId);

  const [deleted] = await db
    .delete(caseMembers)
    .where(
      and(
        eq(caseMembers.caseId, caseId),
        eq(caseMembers.userId, userId),
        eq(caseMembers.peran, peran as 'Advokat' | 'Paralegal' | 'Manager'),
      ),
    )
    .returning();

  if (!deleted) throw notFound('Anggota tim tidak ditemukan');

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'remove_member',
    module: 'cases',
    entityType: 'case',
    entityId: caseId,
    description: `Hapus anggota tim (${peran})`,
    metadata: { memberUserId: userId, peran },
  });
}

// --- D4: Timeline ---

export async function listTimeline(db: DbExecutor, user: AuthContext, caseId: string) {
  await requireVisibleCase(db, user, caseId);
  return db
    .select()
    .from(caseTimeline)
    .where(eq(caseTimeline.caseId, caseId))
    .orderBy(desc(caseTimeline.eventDate), desc(caseTimeline.createdAt));
}

export async function addTimelineEntry(
  db: Db,
  user: AuthContext,
  caseId: string,
  input: CreateTimelineInput,
): Promise<typeof caseTimeline.$inferSelect> {
  await requireVisibleCase(db, user, caseId);

  const [row] = await db
    .insert(caseTimeline)
    .values({
      caseId,
      eventType: input.eventType,
      eventDate: input.eventDate ?? todayWib(),
      title: input.title,
      description: input.description ?? null,
      createdBy: user.userId,
    })
    .returning();

  if (!row) throw new Error('Gagal menambah entri timeline');

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'create',
    module: 'timeline',
    entityType: 'case',
    entityId: caseId,
    description: `Tambah entri timeline: ${input.title}`,
  });

  return row;
}

// --- D4: Jadwal ---

export async function listSchedules(db: DbExecutor, user: AuthContext, caseId: string) {
  await requireVisibleCase(db, user, caseId);
  return db
    .select()
    .from(caseSchedules)
    .where(eq(caseSchedules.caseId, caseId))
    .orderBy(desc(caseSchedules.scheduleDate));
}

export async function createSchedule(
  db: Db,
  user: AuthContext,
  caseId: string,
  input: CreateScheduleInput,
): Promise<typeof caseSchedules.$inferSelect> {
  await requireVisibleCase(db, user, caseId);

  const [row] = await db
    .insert(caseSchedules)
    .values({
      caseId,
      scheduleDate: input.scheduleDate,
      scheduleTime: input.scheduleTime ?? null,
      kind: input.kind,
      location: input.location ?? null,
      notes: input.notes ?? null,
      status: input.status,
      createdBy: user.userId,
    })
    .returning();

  if (!row) throw new Error('Gagal membuat jadwal');

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'create',
    module: 'schedules',
    entityType: 'case',
    entityId: caseId,
    description: `Tambah jadwal ${input.kind} ${input.scheduleDate}`,
  });

  return row;
}

export async function updateSchedule(
  db: Db,
  user: AuthContext,
  caseId: string,
  scheduleId: string,
  input: UpdateScheduleInput,
): Promise<typeof caseSchedules.$inferSelect> {
  await requireVisibleCase(db, user, caseId);

  const [updated] = await db
    .update(caseSchedules)
    .set(input)
    .where(and(eq(caseSchedules.id, scheduleId), eq(caseSchedules.caseId, caseId)))
    .returning();
  if (!updated) throw notFound('Jadwal tidak ditemukan');

  return updated;
}

export async function deleteSchedule(
  db: Db,
  user: AuthContext,
  caseId: string,
  scheduleId: string,
): Promise<void> {
  await requireVisibleCase(db, user, caseId);

  const [deleted] = await db
    .delete(caseSchedules)
    .where(and(eq(caseSchedules.id, scheduleId), eq(caseSchedules.caseId, caseId)))
    .returning();
  if (!deleted) throw notFound('Jadwal tidak ditemukan');
}

// --- D4: Dokumen ---

export async function listDocuments(db: DbExecutor, user: AuthContext, caseId: string) {
  await requireVisibleCase(db, user, caseId);
  return db
    .select()
    .from(caseDocuments)
    .where(eq(caseDocuments.caseId, caseId))
    .orderBy(desc(caseDocuments.createdAt));
}

/** Path Storage untuk dokumen perkara: `cases/{caseId}/{docId}/{fileName}`. */
export function documentStoragePath(caseId: string, docId: string, fileName: string): string {
  return `cases/${caseId}/${docId}/${fileName}`;
}

export async function createDocumentRecord(
  db: Db,
  user: AuthContext,
  caseId: string,
  input: {
    title: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    sharedWithClient?: boolean;
  },
): Promise<typeof caseDocuments.$inferSelect> {
  await requireVisibleCase(db, user, caseId);

  const [row] = await db
    .insert(caseDocuments)
    .values({
      caseId,
      title: input.title,
      filePath: input.filePath,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      sharedWithClient: input.sharedWithClient ?? false,
      uploadedBy: user.userId,
    })
    .returning();

  if (!row) throw new Error('Gagal menyimpan catatan dokumen');

  // Entri timeline otomatis untuk dokumen baru.
  await db.insert(caseTimeline).values({
    caseId,
    eventType: 'Dokumen',
    title: `Dokumen diunggah: ${input.title}`,
    description: input.fileName,
    createdBy: user.userId,
  });

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'create',
    module: 'case_documents',
    entityType: 'case',
    entityId: caseId,
    description: `Unggah dokumen ${input.title} (${input.fileName})`,
  });

  return row;
}

export async function updateDocument(
  db: Db,
  user: AuthContext,
  caseId: string,
  docId: string,
  input: UpdateDocumentInput,
): Promise<typeof caseDocuments.$inferSelect> {
  await requireVisibleCase(db, user, caseId);

  const [updated] = await db
    .update(caseDocuments)
    .set(input)
    .where(and(eq(caseDocuments.id, docId), eq(caseDocuments.caseId, caseId)))
    .returning();
  if (!updated) throw notFound('Dokumen tidak ditemukan');

  return updated;
}

/** Hapus dokumen: kembalikan path file lama agar pemanggil dapat membuangnya dari Storage. */
export async function deleteDocument(
  db: Db,
  user: AuthContext,
  caseId: string,
  docId: string,
): Promise<{ filePath: string }> {
  await requireVisibleCase(db, user, caseId);

  const [deleted] = await db
    .delete(caseDocuments)
    .where(and(eq(caseDocuments.id, docId), eq(caseDocuments.caseId, caseId)))
    .returning({ filePath: caseDocuments.filePath });
  if (!deleted) throw notFound('Dokumen tidak ditemukan');

  await logActivity(db, {
    userId: user.userId,
    userName: user.fullName,
    action: 'delete',
    module: 'case_documents',
    entityType: 'case',
    entityId: caseId,
    description: `Hapus dokumen ${docId}`,
  });

  return { filePath: deleted.filePath ?? '' };
}

// --- Util ---

/** Tanggal hari ini dalam format YYYY-MM-DD (WIB). */
export function todayWib(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
}
