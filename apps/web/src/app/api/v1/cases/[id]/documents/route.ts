/**
 * GET  /api/v1/cases/[id]/documents — daftar dokumen (Agent D · D4)
 * POST /api/v1/cases/[id]/documents — unggah dokumen (maks 25 MB, Storage bucket `case-documents`)
 *
 * PRD §5.4: unggah file maks 25 MB, flag `shared_with_client`. Tipe berkas sama dengan surat.
 */
import { randomUUID } from 'crypto';
import { createDb, createSupabaseServiceClient } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  requireUser,
  ensureCan,
  listDocuments,
  createDocumentRecord,
  documentStoragePath,
  requireVisibleCase,
} from '@ekasatra/core';
import { validateUpload } from '@ekasatra/core/surat';
import { badRequest } from '@ekasatra/shared';

const BUCKET = 'case-documents';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'case_documents');

    const rows = await listDocuments(db, user, id);
    return ok(rows);
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'C', 'case_documents');

    const formData = await req.formData();
    const file = formData.get('file');
    const title = String(formData.get('title') ?? '');
    const sharedWithClient = formData.get('sharedWithClient') === 'true';

    if (!title) throw badRequest('Judul dokumen wajib diisi');
    if (!(file instanceof File)) throw badRequest('File dokumen wajib diunggah');
    // Cek akses sebelum menyentuh Storage, supaya tak ada berkas yatim dari perkara orang lain.
    await requireVisibleCase(db, user, id);
    // Tipe, ukuran (25 MB), dan nama aman (tanpa `/` atau `..` di path Storage).
    const fileName = validateUpload(file);

    const docId = randomUUID();
    const path = documentStoragePath(id, docId, fileName);

    // Unggah ke Storage pakai service role (bypass RLS).
    const storage = createSupabaseServiceClient();
    const { error: uploadError } = await storage.storage
      .from(BUCKET)
      .upload(path, file.stream(), {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Gagal mengunggah file ke Storage: ${uploadError.message}`);
    }

    const row = await createDocumentRecord(db, user, id, {
      title,
      filePath: path,
      fileName,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      sharedWithClient,
    });

    return ok(row);
  });
}
