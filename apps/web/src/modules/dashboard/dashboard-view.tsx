import Link from 'next/link';
import { Gavel } from 'lucide-react';
import type { DashboardData } from '@ekasatra/shared';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format';
import { CasesStatusChart, SuratTrendChart } from './charts';

/** Ambang hari untuk penanda tenggat: sampai URGENT_DAYS = mendesak, sampai SOON_DAYS = segera. */
const URGENT_DAYS = 3;
const SOON_DAYS = 7;
/** Batas daftar ringkas di kolom samping. */
const NOTIF_LIMIT = 6;
const ACTIVITY_LIMIT = 5;

function deadlineTone(daysLeft: number): BadgeTone {
  if (daysLeft <= URGENT_DAYS) return 'danger';
  if (daysLeft <= SOON_DAYS) return 'warning';
  return 'info';
}

function Empty({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-navy-400">{children}</p>;
}

function Figure({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-sm text-navy-400">{label}</dt>
      <dd className="mt-1 font-display text-figure font-semibold tabular-nums text-navy-700">
        {value}
      </dd>
      {note ? <p className="mt-0.5 text-xs text-navy-400">{note}</p> : null}
    </div>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { cases, sidang7Hari, tenggat14Hari, surat, piutang } = data;

  return (
    <div>
      <PageHeader
        title="Beranda"
        description="Agenda sidang dan tenggat terdekat lebih dulu, lalu ringkasan perkara dan surat."
      />

      {/* Titik fokus: yang perlu ditangani paling dekat waktunya. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Agenda sidang 7 hari ke depan"
          action={<span className="text-sm text-navy-400">{sidang7Hari.length} agenda</span>}
          className="lg:col-span-2"
        >
          {sidang7Hari.length === 0 ? (
            <Empty>Tidak ada agenda sidang dalam 7 hari ke depan.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {sidang7Hari.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-3 sm:w-52 sm:shrink-0">
                    <Gavel aria-hidden="true" size={18} className="shrink-0 text-navy-300" />
                    <div className="text-sm">
                      <div className="font-semibold tabular-nums text-navy-800">
                        {formatDate(s.scheduleDate)}
                      </div>
                      {s.scheduleTime ? (
                        <div className="tabular-nums text-navy-400">{s.scheduleTime} WIB</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/cases/${s.caseId}`}
                      className="font-medium text-navy-700 hover:underline"
                    >
                      {s.caseTitle}
                    </Link>
                    <div className="mt-0.5 text-sm text-navy-400">
                      {s.kind}, {s.location || 'lokasi belum ditentukan'}
                    </div>
                  </div>
                  <Badge tone="warning">{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tenggat 14 hari ke depan">
          {tenggat14Hari.length === 0 ? (
            <Empty>Tidak ada tenggat dalam 14 hari ke depan.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {tenggat14Hari.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={t.link} className="text-sm font-medium text-navy-700 hover:underline">
                      {t.title}
                    </Link>
                    {t.extraInfo ? <p className="text-xs text-navy-400">{t.extraInfo}</p> : null}
                  </div>
                  <Badge tone={deadlineTone(t.daysLeft)}>
                    {t.daysLeft === 0 ? 'Hari ini' : `H-${t.daysLeft}`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Ringkasan pendukung: satu strip, bukan deretan kartu statistik. */}
      <section
        aria-label="Ringkasan"
        className="mt-6 overflow-hidden rounded-card border border-navy-200 bg-white"
      >
        <dl className="grid divide-navy-100 sm:grid-cols-3 sm:divide-x max-sm:divide-y">
          <Figure
            label="Perkara aktif"
            value={cases.activeCount}
            note={`${cases.completedCount} perkara selesai`}
          />
          <Figure
            label="Surat masuk belum selesai"
            value={surat.masukBelumSelesai}
            note={`Hari ini: ${surat.masukHariIni} masuk, ${surat.keluarHariIni} keluar`}
          />
          {piutang.authorized ? (
            <Figure
              label="Piutang belum lunas"
              value={formatRupiah(piutang.totalOutstanding)}
              note={`${piutang.invoiceCount ?? 0} invoice`}
            />
          ) : (
            <Figure label="Klien baru bulan ini" value={data.klienBaruBulanIni} />
          )}
        </dl>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Surat menunggu persetujuan Anda"
          action={<Badge tone={data.approvalMenungguSaya.count > 0 ? 'warning' : 'neutral'}>
            {data.approvalMenungguSaya.count}
          </Badge>}
        >
          {data.approvalMenungguSaya.items.length === 0 ? (
            <Empty>Semua surat sudah ditinjau atau ditandatangani.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.approvalMenungguSaya.items.map((a) => (
                <li key={a.id} className="py-3">
                  <Link
                    href={`/surat-keluar/${a.id}`}
                    className="text-sm font-medium text-navy-700 hover:underline"
                  >
                    {a.subject}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-navy-400">
                    <Badge tone="warning">{a.status}</Badge>
                    {a.noSurat ? <span>No. {a.noSurat}</span> : null}
                    {a.tglSurat ? <span>{formatDate(a.tglSurat)}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pemberitahuan untuk Anda">
          {data.notifikasiPersonal.length === 0 ? (
            <Empty>Tidak ada pemberitahuan baru.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.notifikasiPersonal.slice(0, NOTIF_LIMIT).map((n) => (
                <li key={n.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={n.link} className="font-medium text-navy-700 hover:underline">
                      {n.title}
                    </Link>
                    {n.urgency === 'high' ? <Badge tone="danger">Mendesak</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-navy-400">{n.description}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-navy-400">{formatDate(n.date)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Aktivitas terbaru">
          {data.aktivitasTerbaru.length === 0 ? (
            <Empty>Belum ada aktivitas tercatat.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {data.aktivitasTerbaru.slice(0, ACTIVITY_LIMIT).map((act) => (
                <li key={act.id} className="py-3 text-sm">
                  <p className="text-navy-800">
                    <span className="font-medium">{act.userName || 'Sistem'}</span>{' '}
                    {act.action} pada {act.module}
                    {act.description ? ` (${act.description})` : ''}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-navy-400">
                    {formatDateTime(act.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Berapa perkara di tiap status?">
          <CasesStatusChart byStatus={cases.byStatus} />
        </Card>
        <Card title="Surat masuk dan keluar, 6 bulan terakhir">
          <SuratTrendChart trend6Bulan={surat.trend6Bulan} />
        </Card>
      </div>
    </div>
  );
}
