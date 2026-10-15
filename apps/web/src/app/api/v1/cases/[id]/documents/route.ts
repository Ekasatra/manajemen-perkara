/**
 * GET  /api/v1/cases/[id]/documents — daftar dokumen (Agent D · D4)
 * POST /api/v1/cases/[id]/documents — unggah dokumen (maks 25 MB, Storage bucket `case-documents`)
 *
 * PRD §5.4: unggah file maks 25 MB, flag `shared_with_client`.
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
} from '@ekasatra/core';
import { MAX_DOCUMENT_BYTES, badRequest } from '@ekasatra/shared';

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
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw badRequest(`Ukuran file melebihi 25 MB (diterima ${Math.round(file.size / 1024 / 1024)} MB)`);
    }
    if (file.size === 0) throw badRequest('File kosong');

    const docId = randomUUID();
    const fileName = file.name || `dokumen-${docId}`;
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
