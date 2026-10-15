/**
 * GET /api/v1/cases/[id]/documents/[docId]/download — unduh dokumen via signed URL (Agent D · D4)
 * PRD §8: file privat, akses lewat signed URL dari server.
 */
import { and, eq } from 'drizzle-orm';
import { createDb, createSupabaseServiceClient, caseDocuments } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  requireUser,
  ensureCan,
  requireVisibleCase,
} from '@ekasatra/core';
import { notFound } from '@ekasatra/shared';

const BUCKET = 'case-documents';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  return runRoute(async () => {
    const { id, docId } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'case_documents');

    // Pastikan perkara terlihat user.
    await requireVisibleCase(db, user, id);

    // Ambil metadata dokumen (pastikan milik perkara ini).
    const [doc] = await db
      .select()
      .from(caseDocuments)
      .where(and(eq(caseDocuments.id, docId), eq(caseDocuments.caseId, id)))
      .limit(1);
    if (!doc) throw notFound('Dokumen tidak ditemukan');

    // Buat signed URL (berlaku 5 menit).
    const storage = createSupabaseServiceClient();
    const { data, error } = await storage.storage
      .from(BUCKET)
      .createSignedUrl(doc.filePath, 300);

    if (error || !data?.signedUrl) {
      throw new Error(`Gagal membuat signed URL: ${error?.message ?? 'tidak diketahui'}`);
    }

    return ok({ url: data.signedUrl, fileName: doc.fileName, mimeType: doc.mimeType });
  });
}
