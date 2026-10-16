/**
 * Dokumen & Drive: katalog dokumen semua perkara yang boleh dilihat pengguna, dengan unggah,
 * unduh, dan hapus. Berkas tersimpan di Storage bucket `case-documents` (bukan Google Drive).
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { can, ensureCan, listCases, listDocumentCatalog, requireUser } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
import { DocumentCatalog } from '@/modules/documents/document-catalog';

export const dynamic = 'force-dynamic';

const CASE_OPTIONS = 200;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; perkara?: string }>;
}) {
  const { q, perkara } = await searchParams;
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'case_documents');

  const [docs, caseList] = await Promise.all([
    listDocumentCatalog(db, user, { q: q?.trim() || undefined, caseId: perkara || undefined }),
    listCases(db, user, { page: 1, pageSize: CASE_OPTIONS, offset: 0 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dokumen & Drive"
      />
      <DocumentCatalog
        docs={docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
        cases={caseList.rows.map((c) => ({ id: c.id, label: `${c.regNo} · ${c.title}` }))}
        q={q ?? ''}
        caseFilter={perkara ?? ''}
        canCreate={can(user, 'C', 'case_documents')}
        canDelete={can(user, 'D', 'case_documents')}
      />
    </div>
  );
}
