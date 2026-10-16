/**
 * Template Surat gaya GAS: galeri kartu dengan jenis berkas, kategori sebagai tab, dan pencarian.
 * Berkas tersimpan di Storage bucket `templates`; unggah hanya Admin (Agent E · E6).
 */
import Link from 'next/link';
import { Download, FileText, FolderOpen, Send } from 'lucide-react';
import { can } from '@ekasatra/core';
import { listTemplates } from '@ekasatra/core/surat';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClass } from '@/components/ui/styles';
import { formatDate } from '@/lib/format';
import type { SearchParams } from '@/lib/pagination';
import { pageCtx } from '@/modules/surat/page-ctx';
import { UploadTemplateDialog } from '@/modules/templates/upload-template-dialog';

/** Jenis berkas dari ekstensi nama file: label dan warna lencana seperti di aplikasi GAS. */
function fileType(fileName: string | null | undefined): { label: string; tone: BadgeTone } {
  const ext = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (['doc', 'docx'].includes(ext)) return { label: 'Word', tone: 'indigo' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'Spreadsheet', tone: 'success' };
  if (['ppt', 'pptx'].includes(ext)) return { label: 'Presentasi', tone: 'orange' };
  if (ext === 'pdf') return { label: 'PDF', tone: 'danger' };
  if (['png', 'jpg', 'jpeg'].includes(ext)) return { label: 'Gambar', tone: 'warning' };
  return { label: 'File', tone: 'neutral' };
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { db, user } = await pageCtx();
  const params = await searchParams;
  const groups = await listTemplates(db, user);
  const q = typeof params.q === 'string' ? params.q.trim().toLowerCase() : '';
  const cat = typeof params.kat === 'string' ? params.kat : '';

  const all = groups.flatMap((g) => g.items);
  const shown = all.filter(
    (t) => (!cat || t.category === cat) && (!q || t.name.toLowerCase().includes(q)),
  );
  const upload = can(user, 'C', 'templates') ? (
    <UploadTemplateDialog categories={groups.map((g) => g.category)} />
  ) : null;
  const canUseForSurat = can(user, 'C', 'surat_keluar');

  const catHref = (c: string) => {
    const qs = new URLSearchParams();
    if (c) qs.set('kat', c);
    if (q) qs.set('q', q);
    return `/templates${qs.size ? `?${qs}` : ''}`;
  };

  return (
    <div>
      <PageHeader
        title="Template Surat"
        description="Unduh template, isi nomor dan isi surat, lalu unggah di menu Surat Keluar."
        actions={upload}
      />

      <div className="card-surface mb-4">
        <div className="border-b border-navy-50 p-3">
          <nav
            aria-label="Kategori template"
            className="flex w-full gap-1 overflow-x-auto rounded-control bg-navy-50/70 p-1 sm:w-fit"
          >
            {['', ...groups.map((g) => g.category)].map((c) => (
              <Link
                key={c || 'all'}
                href={catHref(c)}
                aria-current={cat === c ? 'page' : undefined}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  cat === c
                    ? 'bg-surface text-navy-800 shadow-soft'
                    : 'text-navy-500 hover:bg-surface/70 hover:text-navy-800'
                }`}
              >
                {c || 'Semua'}
              </Link>
            ))}
          </nav>
        </div>
        <FilterBar
          q={typeof params.q === 'string' ? params.q : ''}
          placeholder="Cari template…"
          hidden={{ kat: cat }}
          selects={[]}
        />
      </div>

      {shown.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-2 py-14 text-sm text-navy-400">
          <FolderOpen aria-hidden="true" size={28} className="text-navy-300" />
          {all.length
            ? 'Tidak ada template yang cocok'
            : 'Belum ada template. Admin dapat mengunggah template surat yang bisa diunduh seluruh staf.'}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map((t) => {
            const type = fileType(t.fileName);
            return (
              <li key={t.id} className="card-surface flex flex-col overflow-hidden">
                <div className="relative flex h-40 items-center justify-center bg-navy-50/60 text-navy-300">
                  <FileText aria-hidden="true" size={44} strokeWidth={1.3} />
                  <span className="absolute left-2 top-2">
                    <Badge tone={type.tone}>{type.label}</Badge>
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-navy-800" title={t.name}>
                    {t.name}
                  </h3>
                  <p className="mt-1 text-xs text-navy-400">
                    {t.category} · {formatDate(t.createdAt)}
                  </p>
                  {t.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-navy-500">{t.description}</p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <a
                      href={`/api/v1/templates/${t.id}/file`}
                      className={`${buttonClass.secondary} min-h-9 px-3 py-1.5 text-xs`}
                    >
                      <Download aria-hidden="true" size={14} /> Unduh
                    </a>
                    {canUseForSurat ? (
                      <Link
                        href="/surat-keluar"
                        title="Unggah surat yang dibuat dari template ini"
                        aria-label={`Unggah surat dari template ${t.name}`}
                        className={`${buttonClass.primary} min-h-9 px-3 py-1.5 text-xs`}
                      >
                        <Send aria-hidden="true" size={14} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
