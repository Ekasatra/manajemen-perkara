/** Service template surat (Agent E · E6) — PRD §5.7. Unggah/ubah/hapus Admin, unduh semua staf. */
import { asc, eq } from 'drizzle-orm';
import { templates } from '@ekasatra/db';
import { notFound } from '@ekasatra/shared';
import type { AuthContext } from '../kernel/auth';
import { withTx, type DbExecutor } from '../kernel/db-helpers';
import { logActivity } from '../kernel/activity';
import { ensureCan } from '../kernel/policy';
import type { CreateTemplateInput } from './schemas';
import { assertUploaded, removeFile, signedDownloadUrl } from './storage';

const BUCKET = 'templates';
export const TEMPLATE_PREFIX = 'tpl';

type Row = typeof templates.$inferSelect;

/** Terkelompok per kategori (urut kategori, lalu nama). Jumlah template kecil → tanpa paginasi. */
export async function listTemplates(
  db: DbExecutor,
  user: AuthContext,
): Promise<{ category: string; items: Row[] }[]> {
  ensureCan(user, 'R', 'templates');
  const rows = await db.select().from(templates).orderBy(asc(templates.category), asc(templates.name));
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);
  return [...groups].map(([category, items]) => ({ category, items }));
}

export async function createTemplate(
  db: DbExecutor,
  user: AuthContext,
  input: CreateTemplateInput,
): Promise<Row> {
  ensureCan(user, 'C', 'templates');
  await assertUploaded({
    bucket: BUCKET,
    path: input.filePath,
    prefix: TEMPLATE_PREFIX,
    userId: user.userId,
  });
  return withTx(db, async (tx) => {
    const [row] = await tx
      .insert(templates)
      .values({
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        filePath: input.filePath,
        fileName: input.fileName ?? null,
        fileSize: input.fileSize ?? null,
        uploadedBy: user.userId,
      })
      .returning();
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'create',
      module: 'templates',
      entityType: 'templates',
      entityId: row!.id,
      description: `Mengunggah template ${input.name}`,
    });
    return row!;
  });
}

export async function deleteTemplate(db: DbExecutor, user: AuthContext, id: string): Promise<void> {
  ensureCan(user, 'D', 'templates');
  const [cur] = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  if (!cur) throw notFound('Template tidak ditemukan');
  await withTx(db, async (tx) => {
    await tx.delete(templates).where(eq(templates.id, id));
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: 'templates',
      entityType: 'templates',
      entityId: id,
      description: `Menghapus template ${cur.name}`,
    });
  });
  await removeFile(BUCKET, cur.filePath);
}

export async function templateFileUrl(
  db: DbExecutor,
  user: AuthContext,
  id: string,
): Promise<string> {
  ensureCan(user, 'R', 'templates');
  const [t] = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  if (!t) throw notFound('Template tidak ditemukan');
  return signedDownloadUrl(BUCKET, t.filePath, t.fileName);
}
