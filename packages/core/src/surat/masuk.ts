/**
 * Service surat masuk (Agent E · E1) — PRD §5.5.
 * Disposisi: mengisi `assigned_to` pada surat Belum → otomatis Didisposisi + email.
 */
import { and, count, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL } from 'drizzle-orm';
import { suratMasuk } from '@ekasatra/db';
import { notFound, validationError } from '@ekasatra/shared';
import type { AuthContext } from '../kernel/auth';
import { withTx, nextCounter, type DbExecutor } from '../kernel/db-helpers';
import { logActivity } from '../kernel/activity';
import { ensureCan, isAdminRole } from '../kernel/policy';
import { defaultDeps, type SuratDeps } from './deps';
import type { CreateSuratMasukInput, UpdateSuratMasukInput } from './schemas';
import { assertUploaded, removeFile, signedDownloadUrl } from './storage';

const BUCKET = 'surat';
const PREFIX = 'masuk';
const WIB_MS = 7 * 3600 * 1000;

type Row = typeof suratMasuk.$inferSelect;
const isAdmin = (u: AuthContext) => isAdminRole(u.role);

/** Tanggal & tahun menurut WIB (server berjalan UTC). */
export function wibToday(now: Date = new Date()): { date: string; year: number } {
  const d = new Date(now.getTime() + WIB_MS);
  return { date: d.toISOString().slice(0, 10), year: d.getUTCFullYear() };
}

/** `SM/{tahun}/{0001}` */
export function formatNoAgenda(year: number, n: number): string {
  return `SM/${year}/${String(n).padStart(4, '0')}`;
}

async function loadVisible(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  deps: SuratDeps,
): Promise<Row> {
  const [row] = await db.select().from(suratMasuk).where(eq(suratMasuk.id, id)).limit(1);
  if (!row) throw notFound('Surat masuk tidak ditemukan');
  if (isAdmin(user) || !row.caseId) return row;
  if (row.createdBy === user.userId || row.assignedTo === user.userId) return row;
  if (await deps.cases.getCase(db, user, row.caseId)) return row;
  throw notFound('Surat masuk tidak ditemukan');
}

async function assertCase(db: DbExecutor, user: AuthContext, caseId: string, deps: SuratDeps) {
  if (!(await deps.cases.getCase(db, user, caseId))) throw notFound('Perkara tidak ditemukan');
}

async function sendDisposisi(deps: SuratDeps, row: Row, by: AuthContext, toUserId: string) {
  if (toUserId === by.userId) return;
  await deps
    .notifier
    .notify({
      preference: 'email_disposisi',
      toUserIds: [toUserId],
      subject: `[EKASATRA] Disposisi surat masuk ${row.noAgenda}`,
      body: `${by.fullName} mendisposisikan surat dari ${row.sender} — ${row.subject}.${
        row.disposisiNote ? `\nCatatan: ${row.disposisiNote}` : ''
      }`,
    })
    .catch(() => undefined);
}

export async function createSuratMasuk(
  db: DbExecutor,
  user: AuthContext,
  input: CreateSuratMasukInput,
  deps: SuratDeps = defaultDeps,
): Promise<Row> {
  ensureCan(user, 'C', 'surat_masuk');
  if (input.caseId) await assertCase(db, user, input.caseId, deps);
  if (input.filePath) {
    await assertUploaded({ bucket: BUCKET, path: input.filePath, prefix: PREFIX, userId: user.userId });
  }
  const today = wibToday();

  const row = await withTx(db, async (tx) => {
    const n = await nextCounter(tx, `SM/${today.year}`);
    const [created] = await tx
      .insert(suratMasuk)
      .values({
        noAgenda: formatNoAgenda(today.year, n),
        noSurat: input.noSurat ?? null,
        sender: input.sender,
        subject: input.subject,
        tglSurat: input.tglSurat ?? null,
        tglTerima: input.tglTerima ?? today.date,
        sifat: input.sifat,
        caseId: input.caseId ?? null,
        assignedTo: input.assignedTo ?? null,
        status: input.assignedTo ? 'Didisposisi' : 'Belum',
        disposisiNote: input.disposisiNote ?? null,
        filePath: input.filePath ?? null,
        fileName: input.fileName ?? null,
        createdBy: user.userId,
      })
      .returning();
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'create',
      module: 'surat-masuk',
      entityType: 'surat_masuk',
      entityId: created!.id,
      description: `Mencatat surat masuk ${created!.noAgenda} dari ${input.sender}`,
    });
    return created!;
  });

  if (row.assignedTo) await sendDisposisi(deps, row, user, row.assignedTo);
  return row;
}

export async function updateSuratMasuk(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  input: UpdateSuratMasukInput,
  deps: SuratDeps = defaultDeps,
): Promise<Row> {
  ensureCan(user, 'U', 'surat_masuk');
  const cur = await loadVisible(db, user, id, deps);
  if (input.caseId && input.caseId !== cur.caseId) await assertCase(db, user, input.caseId, deps);
  const fileChanged = !!input.filePath && input.filePath !== cur.filePath;
  if (fileChanged) {
    await assertUploaded({ bucket: BUCKET, path: input.filePath!, prefix: PREFIX, userId: user.userId });
  }

  const disposisiBaru = !!input.assignedTo && input.assignedTo !== cur.assignedTo;
  // Belum + assigned_to terisi → Didisposisi. Status eksplisit dari input menang.
  const status =
    input.status ?? (disposisiBaru && cur.status === 'Belum' ? 'Didisposisi' : cur.status);
  if (status === 'Belum' && (input.assignedTo ?? cur.assignedTo)) {
    throw validationError('Surat yang sudah didisposisikan tidak dapat kembali ke status Belum');
  }

  const row = await withTx(db, async (tx) => {
    const [updated] = await tx
      .update(suratMasuk)
      .set({ ...input, status, updatedAt: new Date() })
      .where(eq(suratMasuk.id, id))
      .returning();
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: disposisiBaru ? 'disposisi' : 'update',
      module: 'surat-masuk',
      entityType: 'surat_masuk',
      entityId: id,
      description: `${disposisiBaru ? 'Disposisi' : 'Mengubah'} surat masuk ${cur.noAgenda}`,
    });
    return updated!;
  });
  if (fileChanged) await removeFile(BUCKET, cur.filePath);
  if (disposisiBaru) await sendDisposisi(deps, row, user, input.assignedTo!);
  return row;
}

export async function deleteSuratMasuk(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  deps: SuratDeps = defaultDeps,
): Promise<void> {
  ensureCan(user, 'D', 'surat_masuk');
  const cur = await loadVisible(db, user, id, deps);
  await withTx(db, async (tx) => {
    await tx.delete(suratMasuk).where(eq(suratMasuk.id, id));
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: 'surat-masuk',
      entityType: 'surat_masuk',
      entityId: id,
      description: `Menghapus surat masuk ${cur.noAgenda}`,
    });
  });
  await removeFile(BUCKET, cur.filePath);
}

export interface ListSuratMasukQuery {
  q?: string | null;
  status?: Row['status'] | null;
  caseId?: string | null;
  /** true → hanya yang didisposisikan kepada user. */
  mine?: boolean;
  sifat?: string | null;
  /** Rentang tanggal terima (YYYY-MM-DD), batas dalam. */
  from?: string | null;
  to?: string | null;
  page: { pageSize: number; offset: number };
}

export async function listSuratMasuk(
  db: DbExecutor,
  user: AuthContext,
  query: ListSuratMasukQuery,
  deps: SuratDeps = defaultDeps,
) {
  ensureCan(user, 'R', 'surat_masuk');
  const conds: (SQL | undefined)[] = [];
  if (!isAdmin(user)) {
    const visible = await deps.cases.visibleCaseIds(db, user);
    if (visible !== 'all') {
      conds.push(
        or(
          isNull(suratMasuk.caseId),
          eq(suratMasuk.createdBy, user.userId),
          eq(suratMasuk.assignedTo, user.userId),
          visible.length ? inArray(suratMasuk.caseId, visible) : undefined,
        ),
      );
    }
  }
  if (query.status) conds.push(eq(suratMasuk.status, query.status));
  if (query.caseId) conds.push(eq(suratMasuk.caseId, query.caseId));
  if (query.mine) conds.push(eq(suratMasuk.assignedTo, user.userId));
  if (query.sifat) conds.push(eq(suratMasuk.sifat, query.sifat));
  if (query.from) conds.push(gte(suratMasuk.tglTerima, query.from));
  if (query.to) conds.push(lte(suratMasuk.tglTerima, query.to));
  if (query.q) {
    const like = `%${query.q}%`;
    conds.push(
      or(
        ilike(suratMasuk.noAgenda, like),
        ilike(suratMasuk.sender, like),
        ilike(suratMasuk.subject, like),
      ),
    );
  }
  const where = and(...conds);
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(suratMasuk)
      .where(where)
      .orderBy(desc(suratMasuk.createdAt))
      .limit(query.page.pageSize)
      .offset(query.page.offset),
    db.select({ value: count() }).from(suratMasuk).where(where),
  ]);
  return { rows, total: total[0]?.value ?? 0 };
}

export async function getSuratMasuk(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  deps: SuratDeps = defaultDeps,
): Promise<Row> {
  ensureCan(user, 'R', 'surat_masuk');
  return loadVisible(db, user, id, deps);
}

export async function suratMasukFileUrl(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  deps: SuratDeps = defaultDeps,
): Promise<string> {
  const s = await getSuratMasuk(db, user, id, deps);
  if (!s.filePath) throw notFound('Berkas tidak ada');
  return signedDownloadUrl(BUCKET, s.filePath, s.fileName);
}

