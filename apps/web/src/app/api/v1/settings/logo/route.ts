/**
 * POST   /api/v1/settings/logo — unggah logo kop (PNG/JPG, maks 2 MB) ke bucket `settings` (Admin).
 * DELETE /api/v1/settings/logo — kembali ke kop tanpa logo.
 * Logo dipakai kop PDF invoice dan kuitansi lewat setting `logo_path`.
 */
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { createDb, createSupabaseServiceClient, settings } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, ensureCan, logActivity } from '@ekasatra/core';
import { badRequest } from '@ekasatra/shared';

const BUCKET = 'settings';
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' };

async function saveLogoPath(path: string, userId: string) {
  const db = createDb();
  await db
    .insert(settings)
    .values({ key: 'logo_path', value: sql`${JSON.stringify(path)}::jsonb`, updatedBy: userId })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: sql`${JSON.stringify(path)}::jsonb`, updatedBy: userId, updatedAt: new Date() },
    });
}

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const user = await requireUser(db, await createSupabaseServerClient());
    ensureCan(user, 'U', 'settings');

    const file = (await req.formData()).get('file');
    if (!(file instanceof File)) throw badRequest('File logo wajib diunggah');
    const ext = TYPES[file.type];
    if (!ext) throw badRequest('Logo harus berformat PNG atau JPG');
    if (file.size > MAX_BYTES) throw badRequest('Ukuran logo maksimal 2 MB');

    const path = `logo/${randomUUID()}.${ext}`;
    const { error } = await createSupabaseServiceClient()
      .storage.from(BUCKET)
      .upload(path, file.stream(), { contentType: file.type, upsert: false });
    if (error) throw new Error(`Gagal mengunggah logo: ${error.message}`);

    await saveLogoPath(path, user.userId);
    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: 'settings',
      entityType: 'settings',
      entityId: null,
      description: 'Mengganti logo kop surat',
    });
    return ok({ logoPath: path });
  });
}

export async function DELETE() {
  return runRoute(async () => {
    const db = createDb();
    const user = await requireUser(db, await createSupabaseServerClient());
    ensureCan(user, 'U', 'settings');
    await saveLogoPath('', user.userId);
    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: 'settings',
      entityType: 'settings',
      entityId: null,
      description: 'Menghapus logo kop surat (memakai kop tanpa logo)',
    });
    return ok({ logoPath: '' });
  });
}
