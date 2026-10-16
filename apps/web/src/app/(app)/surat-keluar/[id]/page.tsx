/** Detail Surat Keluar + riwayat approval + aksi sesuai hak (Agent E · E5). */
import { getSuratKeluar } from '@ekasatra/core/surat';
import { JenisBadge, SuratKeluarStatusBadge } from '@/modules/surat/surat-badges';
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
    ['Jenis', <JenisBadge key="jenis" value={surat.jenis} />],
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
        status={<SuratKeluarStatusBadge value={surat.status} />}
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

      <section aria-labelledby="riwayat" className="card-surface p-5">
        <h2 id="riwayat" className="mb-4 text-sm font-bold text-navy-800">
          Riwayat Persetujuan
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-navy-400">Belum ada langkah approval.</p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-gold-300 pl-6">
            {logs.map((l) => (
              <li key={l.id} className="relative text-sm">
                <span
                  aria-hidden="true"
                  className="absolute -left-[33px] top-0.5 size-4 rounded-full border-[3px] border-gold-500 bg-surface"
                />
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
