/** Template surat per kategori; unggah hanya Admin (Agent E · E6). */
import { can } from '@ekasatra/core';
import { listTemplates } from '@ekasatra/core/surat';
import { EmptyState } from '@/shell/states';
import { PageHeader } from '@/components/ui/page-header';
import { formatDate } from '@/lib/format';
import { pageCtx } from '@/modules/surat/page-ctx';
import { DownloadLink } from '@/modules/surat/download-link';
import { UploadTemplateDialog } from '@/modules/templates/upload-template-dialog';

export default async function TemplatesPage() {
  const { db, user } = await pageCtx();
  const groups = await listTemplates(db, user);
  const upload = can(user, 'C', 'templates') ? (
    <UploadTemplateDialog categories={groups.map((g) => g.category)} />
  ) : null;

  return (
    <div>
      <PageHeader
        title="Template Surat"
        description="Template surat per kategori yang dapat diunduh seluruh staf."
        actions={upload}
      />
      {groups.length === 0 ? (
        <EmptyState
          title="Belum ada template"
          hint="Admin dapat mengunggah template surat yang bisa diunduh seluruh staf."
          action={upload}
        />
      ) : (
        groups.map((g) => (
          <section key={g.category} aria-labelledby={`cat-${g.category}`} className="mb-6">
            <h2 id={`cat-${g.category}`} className="mb-2 text-base text-navy-800">
              {g.category}
            </h2>
            <ul className="divide-y divide-navy-100 card-surface">
              {g.items.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium text-navy-800">{t.name}</p>
                    <p className="text-sm text-navy-400">
                      {t.description ? `${t.description} · ` : ''}
                      {formatDate(t.createdAt)}
                    </p>
                  </div>
                  <DownloadLink endpoint={`/api/v1/templates/${t.id}/file`} label="Unduh" />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
