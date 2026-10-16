/** Detail Surat Masuk + disposisi (Agent E · E1). */
import Link from 'next/link';
import { CornerDownRight } from 'lucide-react';
import { can } from '@ekasatra/core';
import { getSuratMasuk, listCaseOptions, listStaffOptions } from '@ekasatra/core/surat';
import { SifatBadge, SuratMasukStatusBadge } from '@/modules/surat/surat-badges';
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
  const [s, staff, cases] = await Promise.all([
    getSuratMasuk(db, user, id),
    listStaffOptions(db),
    listCaseOptions(db, user),
  ]);
  const nameOf = (uid: string | null) => staff.find((p) => p.id === uid)?.fullName ?? null;
  const perkara = cases.find((c) => c.id === s.caseId);

  const rows: [string, React.ReactNode][] = [
    ['Pengirim', s.sender],
    ['Nomor Surat', s.noSurat ?? '—'],
    ['Tanggal Surat', s.tglSurat ? formatDate(s.tglSurat) : '—'],
    ['Sifat', <SifatBadge key="sifat" value={s.sifat} />],
    ['Status', <SuratMasukStatusBadge key="status" value={s.status} />],
    [
      'Perkara',
      perkara ? (
        <Link key="case" href={`/cases/${perkara.id}`} className="text-gold-700 underline">
          {perkara.regNo} · {perkara.title}
        </Link>
      ) : (
        '—'
      ),
    ],
  ];

  return (
    <div className="space-y-5">
      <FileHeader
        back={{ href: '/surat-masuk', label: 'Surat Masuk' }}
        reference={`${s.noAgenda} · diterima ${formatDate(s.tglTerima)}`}
        title={s.subject}
        actions={
          s.filePath ? (
            <DownloadLink endpoint={`/api/v1/surat-masuk/${s.id}/file`} label="Lihat lampiran" />
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <section className="card-surface p-5 md:col-span-3">
          <FactList rows={rows} bare />
          <p className="mt-4 text-[11px] text-navy-400">
            Dicatat {formatDate(s.createdAt)}
            {nameOf(s.createdBy) ? ` oleh ${nameOf(s.createdBy)}` : ''}
          </p>
        </section>

        <section
          aria-labelledby="disposisi"
          className="rounded-card bg-navy-50/60 p-4 md:col-span-2"
        >
          <h2
            id="disposisi"
            className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-800"
          >
            <CornerDownRight aria-hidden="true" size={16} className="text-gold-500" /> Disposisi
          </h2>
          {can(user, 'U', 'surat_masuk') ? (
            <DisposisiForm
              id={s.id}
              status={s.status}
              assignedTo={s.assignedTo}
              note={s.disposisiNote}
              staff={staff.map((p) => ({ id: p.id, label: p.fullName }))}
            />
          ) : (
            <div className="text-sm">
              <p>{nameOf(s.assignedTo) ?? 'Belum didisposisi'}</p>
              <p className="mt-2 text-navy-500">{s.disposisiNote ?? ''}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
