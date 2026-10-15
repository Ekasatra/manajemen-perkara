/** Detail Surat Keluar + riwayat approval + aksi sesuai hak (Agent E · E5). */
import Link from 'next/link';
import { getSuratKeluar } from '@ekasatra/core/surat';
import { formatDate, formatDateTime } from '@/lib/format';
import { pageCtx } from '@/modules/surat/page-ctx';
import { DownloadLink } from '@/modules/surat/download-link';
import { ApprovalActions } from '@/modules/surat-keluar/approval-actions';
import { EditSuratKeluarDialog } from '@/modules/surat-keluar/edit-surat-keluar-dialog';

export default async function SuratKeluarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db, user } = await pageCtx();
  const { surat, logs, names, perkara, actions, canEdit } = await getSuratKeluar(db, user, id);
  const nameOf = (uid: string | null) => (uid ? (names[uid] ?? '—') : '—');

  const rows: [string, React.ReactNode][] = [
    ['Nomor surat', surat.noSurat],
    ['Tanggal surat', formatDate(surat.tglSurat)],
    ['Kepada', surat.kepada],
    ['Perihal', surat.perihal],
    ['Jenis', surat.jenis],
    ['Perkara', perkara ? `${perkara.regNo} — ${perkara.title}` : '—'],
    ['Pembuat', nameOf(surat.createdBy)],
    ['Reviewer', nameOf(surat.reviewerId)],
    ['Penandatangan', nameOf(surat.signerId)],
    ['Ditandatangani', surat.signedAt ? formatDateTime(surat.signedAt) : '—'],
    ['Terkirim', surat.sentAt ? `${formatDateTime(surat.sentAt)}${surat.sentToEmail ? ` ke ${surat.sentToEmail}` : ''}` : '—'],
    ['Catatan', surat.notes ?? '—'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/surat-keluar" className="text-sm text-navy-600 underline">
          ← Surat Keluar
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-navy-700">
            {surat.noSurat}{' '}
            <span className="ml-2 rounded bg-navy-50 px-2 py-0.5 text-sm font-medium text-navy-600">
              {surat.status.replace('_', ' ')}
            </span>
          </h1>
          <div className="flex flex-wrap gap-2">
            {canEdit ? <EditSuratKeluarDialog surat={surat} /> : null}
            <DownloadLink endpoint={`/api/v1/surat-keluar/${surat.id}/file`} label="Unduh surat" />
            {surat.signedFilePath ? (
              <DownloadLink
                endpoint={`/api/v1/surat-keluar/${surat.id}/file?which=signed`}
                label="Unduh bertanda tangan"
              />
            ) : null}
          </div>
        </div>
      </div>

      <ApprovalActions id={surat.id} actions={actions} />

      <dl className="grid gap-x-6 gap-y-3 rounded-md border border-navy-200 bg-white p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{k}</dt>
            <dd className="text-sm text-navy-800">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="riwayat">
        <h2 id="riwayat" className="mb-2 font-display text-xl font-semibold text-navy-800">
          Riwayat approval
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-navy-400">Belum ada langkah approval.</p>
        ) : (
          <ol className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="rounded-md border border-navy-200 bg-white p-3 text-sm">
                <p className="font-medium text-navy-800">
                  {l.action} — {l.actorName ?? 'Pengguna dihapus'}
                </p>
                <p className="text-navy-600">
                  {l.fromStatus?.replace('_', ' ')} → {l.toStatus?.replace('_', ' ')} ·{' '}
                  {formatDateTime(l.createdAt)}
                </p>
                {l.note ? <p className="mt-1 text-navy-800">Catatan: {l.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
