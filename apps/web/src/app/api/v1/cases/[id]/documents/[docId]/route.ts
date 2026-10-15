/**
 * PATCH  /api/v1/cases/[id]/documents/[docId] — update metadata dokumen (Agent D · D4)
 * DELETE /api/v1/cases/[id]/documents/[docId] — hapus dokumen + buang file lama dari Storage
 *
 * PRD §5.4: mengganti/menghapus dokumen membuang file lamanya.
 */
import { createDb, createSupabaseServiceClient } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  updateDocument,
  deleteDocument,
} from '@ekasatra/core';
import { updateDocumentSchema } from '@ekasatra/shared';

const BUCKET = 'case-documents';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  return runRoute(async () => {
    const { id, docId } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'case_documents');

    const body = await parseBody(req, updateDocumentSchema);
    const row = await updateDocument(db, user, id, docId, body);
    return ok(row);
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  return runRoute(async () => {
    const { id, docId } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'D', 'case_documents');

    const { filePath } = await deleteDocument(db, user, id, docId);

    // Buang file lama dari Storage (PRD §5.4).
    const storage = createSupabaseServiceClient();
    const { error } = await storage.storage.from(BUCKET).remove([filePath]);
    if (error) {
      // Bukan fatal — catatan DB sudah dihapus. Log saja.
      console.error(`[cases] Gagal menghapus file Storage ${filePath}:`, error.message);
    }

    return ok({ success: true });
  });
}
