'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, FileText, Search, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FormDialog } from '@/components/ui/form-dialog';
import { Label } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { formatDate } from '@/lib/format';
import { useToast } from '@/shell/toast';

export type CatalogDoc = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseRegNo: string;
  title: string;
  fileName: string | null;
  fileSize: number | null;
  sharedWithClient: boolean;
  uploadedByName: string | null;
  createdAt: string;
};

function sizeText(n: number | null): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentCatalog({
  docs,
  cases,
  q,
  caseFilter,
  canCreate,
  canDelete,
}: {
  docs: CatalogDoc[];
  cases: { id: string; label: string }[];
  q: string;
  caseFilter: string;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CatalogDoc | null>(null);

  async function upload(fd: FormData) {
    const caseId = String(fd.get('caseId') ?? '');
    fd.delete('caseId');
    const res = await fetch(`/api/v1/cases/${caseId}/documents`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal mengunggah dokumen');
    setUploadOpen(false);
    toast.show('Dokumen diunggah.');
    router.refresh();
  }

  async function remove() {
    if (!toDelete) return;
    const res = await fetch(`/api/v1/cases/${toDelete.caseId}/documents/${toDelete.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menghapus dokumen');
    setToDelete(null);
    toast.show('Dokumen dihapus.');
    router.refresh();
  }

  return (
    <div>
      <div className="card-surface mb-4 flex flex-wrap items-end gap-3 p-4">
        <form
          className="grid flex-1 gap-3 sm:grid-cols-[1fr_minmax(0,260px)_auto]"
          action="/dokumen"
        >
          <div className="relative">
            <label htmlFor="dk-q" className="sr-only">
              Cari dokumen
            </label>
            <Search
              aria-hidden="true"
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300"
            />
            <input
              id="dk-q"
              name="q"
              defaultValue={q}
              placeholder="Cari judul dokumen"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div>
            <label htmlFor="dk-case" className="sr-only">
              Perkara
            </label>
            <select id="dk-case" name="perkara" defaultValue={caseFilter} className={inputClass}>
              <option value="">Semua perkara</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass.secondary}>
            Terapkan
          </button>
        </form>
        {canCreate ? (
          <button type="button" onClick={() => setUploadOpen(true)} className={buttonClass.primary}>
            <Upload aria-hidden="true" size={15} /> Unggah Dokumen
          </button>
        ) : null}
      </div>

      {docs.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-2 py-12 text-sm text-navy-400">
          <FileText aria-hidden="true" size={28} className="text-navy-300" />
          Belum ada dokumen
        </div>
      ) : (
        <ul className="card-surface divide-y divide-navy-50 overflow-hidden">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-control bg-navy-50 text-navy-600"
              >
                <FileText size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-navy-800">{d.title}</div>
                <div className="truncate text-xs text-navy-400">
                  {d.fileName ?? '-'}
                  {sizeText(d.fileSize) ? ` · ${sizeText(d.fileSize)}` : ''}
                  {` · ${formatDate(d.createdAt)}`}
                  {d.uploadedByName ? ` · ${d.uploadedByName}` : ''}
                </div>
                <Link href={`/cases/${d.caseId}`} className="text-xs text-navy-600 underline">
                  {d.caseRegNo} · {d.caseTitle}
                </Link>
              </div>
              {d.sharedWithClient ? <Badge tone="success">Di portal klien</Badge> : null}
              <a
                href={`/api/v1/cases/${d.caseId}/documents/${d.id}/download`}
                className={`${buttonClass.secondary} px-3 text-xs`}
              >
                <Download aria-hidden="true" size={14} /> Unduh
              </a>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setToDelete(d)}
                  aria-label={`Hapus ${d.title}`}
                  className={`${buttonClass.softDanger} px-3 text-xs`}
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canCreate ? (
        <FormDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          title="Unggah Dokumen"
          description="Disimpan per perkara. Maksimum 25 MB."
          submitLabel="Unggah"
          onSubmit={upload}
        >
          <div>
            <Label htmlFor="up-case" required>
              Perkara
            </Label>
            <select id="up-case" name="caseId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Pilih perkara
              </option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="up-title" required>
              Nama Dokumen
            </Label>
            <input id="up-title" name="title" required className={inputClass} />
          </div>
          <div>
            <Label htmlFor="up-file" required>
              File (PDF, Word, Excel, JPG, PNG)
            </Label>
            <input
              id="up-file"
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              className={inputClass}
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-navy-800">
            <input
              type="checkbox"
              name="sharedWithClient"
              value="true"
              className="size-4 accent-gold-500"
            />
            Bagikan ke portal klien
          </label>
        </FormDialog>
      ) : null}

      <FormDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Hapus dokumen?"
        description={
          toDelete
            ? `${toDelete.title} akan dihapus dari perkara ${toDelete.caseRegNo}. Tindakan ini tercatat di Audit Log.`
            : undefined
        }
        submitLabel="Hapus"
        destructive
        onSubmit={remove}
      >
        <span />
      </FormDialog>
    </div>
  );
}
