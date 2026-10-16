/**
 * Service surat keluar (Agent E · E2/E4). Aturan perpindahan status ada di
 * `approval.ts` (murni); file ini hanya memuat data, memanggilnya, menyimpan.
 */
import { and, count, desc, eq, ilike, inArray, isNotNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { caseTimeline, cases, profiles, suratApprovalLogs, suratKeluar } from '@ekasatra/db';
import { conflict, forbidden, notFound, validationError } from '@ekasatra/shared';
import type { AuthContext } from '../kernel/auth';
import type { DbExecutor } from '../kernel/db-helpers';
import { withTx } from '../kernel/db-helpers';
import { logActivity } from '../kernel/activity';
import { ensureCan, isAdminRole } from '../kernel/policy';
import {
  availableActions,
  canEditSurat,
  resolveRouting,
  transition,
  type ApprovalAction,
  type SuratKeluarStatus,
} from './approval';
import { defaultDeps, isUniqueViolation, readSetting, type SuratDeps } from './deps';
import type {
  ApprovalActionInput,
  CreateSuratKeluarInput,
  UpdateSuratKeluarInput,
} from './schemas';
import { assertUploaded, removeFile, signedDownloadUrl } from './storage';

const BUCKET = 'surat';
const PREFIX = 'keluar';

type Row = typeof suratKeluar.$inferSelect;
const isAdmin = (u: AuthContext) => isAdminRole(u.role);
const actorOf = (u: AuthContext) => ({ id: u.userId, role: u.role });

async function assertNoDuplicate(db: DbExecutor, noSurat: string, exceptId?: string) {
  const where = exceptId
    ? and(sql`lower(${suratKeluar.noSurat}) = lower(${noSurat})`, ne(suratKeluar.id, exceptId))
    : sql`lower(${suratKeluar.noSurat}) = lower(${noSurat})`;
  const [dup] = await db.select({ id: suratKeluar.id }).from(suratKeluar).where(where).limit(1);
  if (dup) throw conflict(`Nomor surat "${noSurat}" sudah digunakan`);
}

/** Muat surat + pastikan terlihat oleh user; tidak terlihat = NOT_FOUND. */
async function loadVisible(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  deps: SuratDeps,
): Promise<Row> {
  const [row] = await db.select().from(suratKeluar).where(eq(suratKeluar.id, id)).limit(1);
  if (!row) throw notFound('Surat keluar tidak ditemukan');
  if (isAdmin(user)) return row;
  const involved = [row.createdBy, row.reviewerId, row.signerId].includes(user.userId);
  if (involved) return row;
  if (row.caseId && (await deps.cases.getCase(db, user, row.caseId))) return row;
  throw notFound('Surat keluar tidak ditemukan');
}

// ------------------------------------------------------------------ E2: CRUD

export async function createSuratKeluar(
  db: DbExecutor,
  user: AuthContext,
  input: CreateSuratKeluarInput,
  deps: SuratDeps = defaultDeps,
): Promise<Row> {
  ensureCan(user, 'C', 'surat_keluar');

  if (input.jenis === 'Perkara') {
    const c = input.caseId ? await deps.cases.getCase(db, user, input.caseId) : null;
    if (!c) throw notFound('Perkara tidak ditemukan');
  }
  await assertUploaded({ bucket: BUCKET, path: input.filePath, prefix: PREFIX, userId: user.userId });
  await assertNoDuplicate(db, input.noSurat);

  try {
    return await withTx(db, async (tx) => {
      const [row] = await tx
        .insert(suratKeluar)
        .values({
          noSurat: input.noSurat,
          tglSurat: input.tglSurat,
          kepada: input.kepada,
          perihal: input.perihal,
          jenis: input.jenis,
          caseId: input.jenis === 'Perkara' ? (input.caseId ?? null) : null,
          reviewerId: input.reviewerId ?? null,
          filePath: input.filePath,
          fileName: input.fileName ?? null,
          notes: input.notes ?? null,
          createdBy: user.userId,
        })
        .returning();
      await logActivity(tx, {
        userId: user.userId,
        userName: user.fullName,
        action: 'create',
        module: 'surat-keluar',
        entityType: 'surat_keluar',
        entityId: row!.id,
        description: `Membuat surat keluar ${input.noSurat}`,
      });
      return row!;
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict(`Nomor surat "${input.noSurat}" sudah digunakan`);
    throw err;
  }
}

export interface ListSuratKeluarQuery {
  q?: string | null;
  status?: SuratKeluarStatus | null;
  jenis?: 'Perkara' | 'Instansi' | null;
  caseId?: string | null;
  /** true → hanya yang sedang menunggu tindakan user (review atau tanda tangan). */
  waiting?: boolean;
  page: { pageSize: number; offset: number };
}

export async function listSuratKeluar(
  db: DbExecutor,
  user: AuthContext,
  query: ListSuratKeluarQuery,
  deps: SuratDeps = defaultDeps,
) {
  ensureCan(user, 'R', 'surat_keluar');

  const conds: (SQL | undefined)[] = [];
  if (!isAdmin(user)) {
    const visible = await deps.cases.visibleCaseIds(db, user);
    const byCase =
      visible === 'all'
        ? isNotNull(suratKeluar.caseId)
        : visible.length
          ? inArray(suratKeluar.caseId, visible)
          : undefined;
    conds.push(
      or(
        eq(suratKeluar.createdBy, user.userId),
        eq(suratKeluar.reviewerId, user.userId),
        eq(suratKeluar.signerId, user.userId),
        byCase,
      ),
    );
  }
  if (query.status) conds.push(eq(suratKeluar.status, query.status));
  if (query.jenis) conds.push(eq(suratKeluar.jenis, query.jenis));
  if (query.caseId) conds.push(eq(suratKeluar.caseId, query.caseId));
  if (query.waiting) {
    conds.push(
      sql`((${suratKeluar.status} = 'Review' and ${suratKeluar.reviewerId} = ${user.userId}) or (${suratKeluar.status} = 'Siap_TTD' and ${suratKeluar.signerId} = ${user.userId}))`,
    );
  }
  if (query.q) {
    const like = `%${query.q}%`;
    conds.push(
      or(
        ilike(suratKeluar.noSurat, like),
        ilike(suratKeluar.perihal, like),
        ilike(suratKeluar.kepada, like),
      ),
    );
  }
  const where = and(...conds);

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(suratKeluar)
      .where(where)
      .orderBy(desc(suratKeluar.createdAt))
      .limit(query.page.pageSize)
      .offset(query.page.offset),
    db.select({ value: count() }).from(suratKeluar).where(where),
  ]);
  return { rows, total: total[0]?.value ?? 0 };
}

export async function getSuratKeluar(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  deps: SuratDeps = defaultDeps,
) {
  ensureCan(user, 'R', 'surat_keluar');
  const surat = await loadVisible(db, user, id, deps);
  const logs = await db
    .select()
    .from(suratApprovalLogs)
    .where(eq(suratApprovalLogs.suratId, id))
    .orderBy(suratApprovalLogs.createdAt);
  const ref = {
    status: surat.status,
    createdBy: surat.createdBy,
    reviewerId: surat.reviewerId,
    signerId: surat.signerId,
  };
  const ids = [surat.createdBy, surat.reviewerId, surat.signerId].filter((v): v is string => !!v);
  const people = ids.length
    ? await db
        .select({ id: profiles.id, fullName: profiles.fullName })
        .from(profiles)
        .where(inArray(profiles.id, ids))
    : [];
  const [perkara] = surat.caseId
    ? await db
        .select({ id: cases.id, regNo: cases.regNo, title: cases.title })
        .from(cases)
        .where(eq(cases.id, surat.caseId))
        .limit(1)
    : [];
  return {
    surat,
    logs,
    names: Object.fromEntries(people.map((p) => [p.id, p.fullName])),
    perkara: perkara ?? null,
    actions: availableActions(ref, actorOf(user)),
    canEdit: canEditSurat(ref, actorOf(user)),
  };
}

export async function updateSuratKeluar(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  input: UpdateSuratKeluarInput,
  deps: SuratDeps = defaultDeps,
): Promise<Row> {
  ensureCan(user, 'U', 'surat_keluar');
  const cur = await loadVisible(db, user, id, deps);
  if (!canEditSurat(cur, actorOf(user))) {
    throw forbidden('Surat tidak dapat diubah pada status ini atau oleh Anda');
  }
  if (input.noSurat && input.noSurat.toLowerCase() !== cur.noSurat.toLowerCase()) {
    await assertNoDuplicate(db, input.noSurat, id);
  }
  const fileChanged = !!input.filePath && input.filePath !== cur.filePath;
  if (fileChanged) {
    await assertUploaded({ bucket: BUCKET, path: input.filePath!, prefix: PREFIX, userId: user.userId });
  }

  try {
    const [row] = await withTx(db, async (tx) => {
      const updated = await tx
        .update(suratKeluar)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(suratKeluar.id, id))
        .returning();
      await logActivity(tx, {
        userId: user.userId,
        userName: user.fullName,
        action: 'update',
        module: 'surat-keluar',
        entityType: 'surat_keluar',
        entityId: id,
        description: `Mengubah surat keluar ${cur.noSurat}`,
      });
      return updated;
    });
    if (fileChanged) await removeFile(BUCKET, cur.filePath);
    return row!;
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict(`Nomor surat "${input.noSurat}" sudah digunakan`);
    throw err;
  }
}

export async function deleteSuratKeluar(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  deps: SuratDeps = defaultDeps,
): Promise<void> {
  ensureCan(user, 'D', 'surat_keluar');
  const cur = await loadVisible(db, user, id, deps);
  if (cur.status !== 'Draft') throw conflict('Hanya surat berstatus Draft yang dapat dihapus');
  await withTx(db, async (tx) => {
    await tx.delete(suratKeluar).where(eq(suratKeluar.id, id));
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: 'surat-keluar',
      entityType: 'surat_keluar',
      entityId: id,
      description: `Menghapus surat keluar ${cur.noSurat}`,
    });
  });
  await removeFile(BUCKET, cur.filePath);
  await removeFile(BUCKET, cur.signedFilePath);
}

export async function suratKeluarFileUrl(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  which: 'file' | 'signed',
  deps: SuratDeps = defaultDeps,
): Promise<string> {
  ensureCan(user, 'R', 'surat_keluar');
  const s = await loadVisible(db, user, id, deps);
  const path = which === 'signed' ? s.signedFilePath : s.filePath;
  if (!path) throw notFound('Berkas tidak ada');
  return signedDownloadUrl(BUCKET, path, s.fileName);
}

// ------------------------------------------------------------- E4: aksi

const ACTION_VERB: Record<ApprovalAction, string> = {
  Submit: 'mengajukan',
  Approve: 'menyetujui',
  Reject: 'menolak',
  Sign: 'menandatangani',
  Send: 'mengirim',
};

/** Admin aktif paling awal dibuat — fallback penandatangan surat Instansi (PRD §5.6). */
async function firstAdminId(db: DbExecutor): Promise<string | null> {
  const [a] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.role, 'Admin'), eq(profiles.isActive, true)))
    .orderBy(profiles.createdAt)
    .limit(1);
  return a?.id ?? null;
}

export async function applySuratAction(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  action: ApprovalAction,
  input: ApprovalActionInput,
  deps: SuratDeps = defaultDeps,
): Promise<Row> {
  ensureCan(user, 'U', 'surat_keluar');
  const cur = await loadVisible(db, user, id, deps);

  // Routing dihitung ulang tiap Submit (tim perkara dapat berubah setelah Reject).
  let routed = { reviewerId: cur.reviewerId, signerId: cur.signerId };
  if (action === 'Submit') {
    const c = cur.caseId ? await deps.cases.getCase(db, user, cur.caseId) : null;
    const creator = cur.createdBy
      ? (await db.select().from(profiles).where(eq(profiles.id, cur.createdBy)).limit(1))[0]
      : undefined;
    const r = resolveRouting({
      jenis: cur.jenis,
      caseAdvokatIds: c?.advokatIds ?? [],
      creatorId: cur.createdBy ?? user.userId,
      creatorRole: creator?.role ?? user.role,
      explicitReviewerId: cur.jenis === 'Instansi' ? cur.reviewerId : null,
      pimpinanUserId: String((await readSetting(db, 'pimpinan_user_id')) ?? '') || null,
      firstAdminId: await firstAdminId(db),
    });
    if (!r.ok) throw validationError(r.message);
    routed = { reviewerId: r.reviewerId, signerId: r.signerId };
  }

  const t = transition({
    surat: { status: cur.status, createdBy: cur.createdBy, ...routed },
    action,
    actor: actorOf(user),
    note: input.note,
  });
  if (!t.ok) {
    if (t.code === 'FORBIDDEN') throw forbidden(t.message);
    if (t.code === 'INVALID_STATE') throw conflict(t.message);
    throw validationError(t.message);
  }

  let signedFilePath: string | null = null;
  if (action === 'Sign' && input.signedFilePath) {
    await assertUploaded({
      bucket: BUCKET,
      path: input.signedFilePath,
      prefix: PREFIX,
      userId: user.userId,
    });
    signedFilePath = input.signedFilePath;
  }

  const now = new Date();
  const row = await withTx(db, async (tx) => {
    const [updated] = await tx
      .update(suratKeluar)
      .set({
        status: t.to,
        reviewerId: routed.reviewerId,
        signerId: routed.signerId,
        ...(action === 'Sign' && { signedAt: now, signedFilePath }),
        ...(action === 'Send' && { sentAt: now, sentToEmail: input.sendToEmail ?? null }),
        updatedAt: now,
      })
      // Penjaga konkurensi: dua klik bersamaan tidak boleh melompati status.
      .where(and(eq(suratKeluar.id, id), eq(suratKeluar.status, cur.status)))
      .returning();
    if (!updated) throw conflict('Status surat sudah berubah, muat ulang halaman');

    await tx.insert(suratApprovalLogs).values({
      suratId: id,
      action,
      actorId: user.userId,
      actorName: user.fullName,
      fromStatus: t.from,
      toStatus: t.to,
      note: t.note,
    });
    if (action === 'Send' && cur.caseId) {
      await tx.insert(caseTimeline).values({
        caseId: cur.caseId,
        eventType: 'Surat',
        title: `Surat keluar ${cur.noSurat} terkirim`,
        description: `Kepada: ${cur.kepada} — ${cur.perihal}`,
        createdBy: user.userId,
      });
    }
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: action.toLowerCase(),
      module: 'surat-keluar',
      entityType: 'surat_keluar',
      entityId: id,
      description: `${user.fullName} ${ACTION_VERB[action]} surat ${cur.noSurat} (${t.from} → ${t.to})`,
    });
    return updated;
  });

  // Email setelah commit; kegagalan kirim tidak membatalkan perpindahan status.
  const subject = `[EKASATRA] Surat ${cur.noSurat}: ${t.to.replace('_', ' ')}`;
  const body = `${user.fullName} ${ACTION_VERB[action]} surat ${cur.noSurat} — ${cur.perihal}.${
    t.note ? `\nCatatan: ${t.note}` : ''
  }`;
  const notice =
    action === 'Send' && input.sendToEmail
      ? deps.notifier.notify({
          preference: 'email_approval',
          toUserIds: [],
          toEmails: [input.sendToEmail],
          subject: `Surat ${cur.noSurat}: ${cur.perihal}`,
          body: `Terlampir surat ${cur.noSurat} dari EKASATRA Law & Policy Advisory.`,
          attachments: [
            {
              bucket: BUCKET,
              path: row.signedFilePath ?? row.filePath,
              fileName: row.fileName ?? `${cur.noSurat}.pdf`,
            },
          ],
        })
      : t.nextActorId && t.nextActorId !== user.userId
        ? deps.notifier.notify({
            preference: 'email_approval',
            toUserIds: [t.nextActorId],
            subject,
            body,
          })
        : Promise.resolve();
  await notice.catch(() => undefined);

  return row;
}
