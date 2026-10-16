/** Detail Surat Masuk + disposisi (Agent E · E1). */
import { can } from '@ekasatra/core';
import { getSuratMasuk, listStaffOptions } from '@ekasatra/core/surat';
import { Badge } from '@/components/ui/badge';
import { FactList } from '@/components/ui/fact-list';
import { FileHeader } from '@/components/ui/file-header';
import { formatDate } from '@/lib/format';
import { pageCtx } from '@/modules/surat/page-ctx';
import { DownloadLink } from '@/modules/surat/download-link';
import { DisposisiForm } from '@/modules/surat-masuk/disposisi-form';

export default async function SuratMasukDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db, user } = await pageCtx();
  const [s, staff] = await Promise.all([getSuratMasuk(db, user, id), listStaffOptions(db)]);
  const assignee = staff.find((p) => p.id === s.assignedTo)?.fullName ?? '-';

  const rows: [string, string][] = [
    ['Nomor surat asal', s.noSurat ?? '-'],
    ['Pengirim', s.sender],
    ['Perihal', s.subject],
    ['Tanggal surat', s.tglSurat ? formatDate(s.tglSurat) : '-'],
    ['Tanggal terima', formatDate(s.tglTerima)],
    ['Sifat', s.sifat],
    ['Didisposisikan kepada', assignee],
    ['Catatan disposisi', s.disposisiNote ?? '-'],
  ];

  return (
    <div className="space-y-6">
      <FileHeader
        back={{ href: '/surat-masuk', label: 'Surat Masuk' }}
        reference="No. agenda"
        status={<Badge tone="info">{s.status}</Badge>}
        title={s.noAgenda}
        actions={
          s.filePath ? (
            <DownloadLink endpoint={`/api/v1/surat-masuk/${s.id}/file`} label="Unduh lampiran" />
          ) : null
        }
      />

      <FactList rows={rows} />

      {can(user, 'U', 'surat_masuk') ? (
        <section aria-labelledby="disposisi" className="max-w-md">
          <h2 id="disposisi" className="mb-2 text-xl text-navy-800">
            Disposisi
          </h2>
          <DisposisiForm
            id={s.id}
            status={s.status}
            assignedTo={s.assignedTo}
            note={s.disposisiNote}
            staff={staff.map((p) => ({ id: p.id, label: p.fullName }))}
          />
        </section>
      ) : null}
    </div>
  );
}
