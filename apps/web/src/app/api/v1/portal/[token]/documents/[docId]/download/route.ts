/**
 * GET /api/v1/portal/[token]/documents/[docId]/download
 * Unduh dokumen perkara dari Portal Klien dengan verifikasi kepemilikan ketat (PRD §5.12 & G3).
 * Galat apa pun (token salah, bukan milik klien, storage gagal) → pesan generik yang sama;
 * path storage internal tidak pernah dikembalikan.
 */
import { createDb, createSupabaseServiceClient } from '@ekasatra/db';
import { PORTAL_GENERIC_ERROR_MESSAGE, notFound } from '@ekasatra/shared';
import { ok, toErrPayload, toResponse, getVerifiedClientDocument } from '@ekasatra/core';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string; docId: string }> },
) {
  try {
    const { token, docId } = await params;
    const doc = await getVerifiedClientDocument(createDb(), token, docId);

    // Signed URL pendek (60 detik) dari bucket privat.
    const { data, error } = await createSupabaseServiceClient()
      .storage.from('case-documents')
      .createSignedUrl(doc.filePath, 60, { download: doc.fileName || true });
    if (error || !data?.signedUrl) throw notFound(PORTAL_GENERIC_ERROR_MESSAGE);

    if (new URL(req.url).searchParams.get('redirect') === 'true') {
      return Response.redirect(data.signedUrl, 302);
    }
    return toResponse(
      ok({ downloadUrl: data.signedUrl, fileName: doc.fileName, mimeType: doc.mimeType }),
    );
  } catch (err) {
    const payload = toErrPayload(err);
    // Token salah, nonaktif, dan bukan-milik-klien harus tak terbedakan: status & pesan sama.
    if (payload.error.code === 'NOT_FOUND' || payload.error.code === 'FORBIDDEN') {
      return Response.json(
        { ok: false, error: { code: 'NOT_FOUND', message: PORTAL_GENERIC_ERROR_MESSAGE } },
        { status: 404 },
      );
    }
    return Response.json(payload, { status: payload.error.code === 'INTERNAL_ERROR' ? 500 : 400 });
  }
}
