/** Detail Surat Masuk + disposisi (Agent E · E1). */
import Link from 'next/link';
import { can } from '@ekasatra/core';
import { getSuratMasuk, listStaffOptions } from '@ekasatra/core/surat';
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
  const assignee = staff.find((p) => p.id === s.assignedTo)?.fullName ?? '—';

  const rows: [string, string][] = [
    ['No. agenda', s.noAgenda],
    ['Nomor surat asal', s.noSurat ?? '—'],
    ['Pengirim', s.sender],
    ['Perihal', s.subject],
    ['Tanggal surat', s.tglSurat ? formatDate(s.tglSurat) : '—'],
    ['Tanggal terima', formatDate(s.tglTerima)],
    ['Sifat', s.sifat],
    ['Status', s.status],
    ['Didisposisikan kepada', assignee],
    ['Catatan disposisi', s.disposisiNote ?? '—'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/surat-masuk" className="text-sm text-navy-600 underline">
          ← Surat Masuk
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-navy-700">{s.noAgenda}</h1>
          {s.filePath ? (
            <DownloadLink endpoint={`/api/v1/surat-masuk/${s.id}/file`} label="Unduh lampiran" />
          ) : null}
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-md border border-navy-200 bg-white p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{k}</dt>
            <dd className="text-sm text-navy-800">{v}</dd>
          </div>
        ))}
      </dl>

      {can(user, 'U', 'surat_masuk') ? (
        <section aria-labelledby="disposisi" className="max-w-md">
          <h2 id="disposisi" className="mb-2 font-display text-xl font-semibold text-navy-800">
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
