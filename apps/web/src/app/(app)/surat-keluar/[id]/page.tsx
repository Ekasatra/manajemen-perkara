/** Detail Surat Keluar + riwayat approval + aksi sesuai hak (Agent E · E5). */
import { getSuratKeluar } from '@ekasatra/core/surat';
import { Badge } from '@/components/ui/badge';
import { FactList } from '@/components/ui/fact-list';
import { FileHeader } from '@/components/ui/file-header';
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
  const nameOf = (uid: string | null) => (uid ? (names[uid] ?? '-') : '-');

  const rows: [string, React.ReactNode][] = [
    ['Tanggal surat', formatDate(surat.tglSurat)],
    ['Kepada', surat.kepada],
    ['Perihal', surat.perihal],
    ['Jenis', surat.jenis],
    ['Perkara', perkara ? `${perkara.regNo} · ${perkara.title}` : '-'],
    ['Pembuat', nameOf(surat.createdBy)],
    ['Reviewer', nameOf(surat.reviewerId)],
    ['Penandatangan', nameOf(surat.signerId)],
    ['Ditandatangani', surat.signedAt ? formatDateTime(surat.signedAt) : '-'],
    [
      'Terkirim',
      surat.sentAt
        ? `${formatDateTime(surat.sentAt)}${surat.sentToEmail ? ` ke ${surat.sentToEmail}` : ''}`
        : '-',
    ],
    ['Catatan', surat.notes ?? '-'],
  ];

  return (
    <div className="space-y-6">
      <FileHeader
        back={{ href: '/surat-keluar', label: 'Surat Keluar' }}
        reference="Nomor surat"
        status={<Badge tone="info">{surat.status.replace('_', ' ')}</Badge>}
        title={surat.noSurat}
        actions={
          <>
            {canEdit ? <EditSuratKeluarDialog surat={surat} /> : null}
            <DownloadLink endpoint={`/api/v1/surat-keluar/${surat.id}/file`} label="Unduh surat" />
            {surat.signedFilePath ? (
              <DownloadLink
                endpoint={`/api/v1/surat-keluar/${surat.id}/file?which=signed`}
                label="Unduh bertanda tangan"
              />
            ) : null}
          </>
        }
      />

      <ApprovalActions id={surat.id} actions={actions} />

      <FactList rows={rows} />

      <section aria-labelledby="riwayat">
        <h2 id="riwayat" className="mb-2 text-xl text-navy-800">
          Riwayat approval
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-navy-400">Belum ada langkah approval.</p>
        ) : (
          <ol className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="rounded-card border border-navy-200 bg-white p-3 text-sm">
                <p className="font-medium text-navy-800">
                  {l.action}, {l.actorName ?? 'Pengguna dihapus'}
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
