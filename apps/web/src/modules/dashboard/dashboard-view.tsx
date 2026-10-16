import Link from 'next/link';
import type { DashboardData } from '@ekasatra/shared';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import type { Column } from '@/components/ui/responsive-table';
import { buttonClass } from '@/components/ui/styles';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format';
import { CaseStatusBadge } from '@/modules/cases/case-status-badge';
import { CreateCaseDialog } from '@/modules/cases/create-case-dialog';
import { CasesStatusChart, SuratTrendChart } from './charts';
import { daysBetween, deadlineBuckets, percent, scheduleLoad, todayWib } from './metrics';
import { KpiCard, MiniBars, Ring, Sparkline } from './visuals';

/** Ambang hari untuk penanda tenggat: sampai URGENT_DAYS = mendesak, sampai SOON_DAYS = segera. */
const URGENT_DAYS = 3;
const SOON_DAYS = 7;
/** Batas daftar ringkas di kolom samping. */
const NOTIF_LIMIT = 6;
const ACTIVITY_LIMIT = 5;

export type RecentCase = {
  id: string;
  regNo: string;
  title: string;
  status: string;
  startDate: string | null;
  upayaDeadline: string | null;
};

function deadlineTone(daysLeft: number): BadgeTone {
  if (daysLeft <= URGENT_DAYS) return 'danger';
  if (daysLeft <= SOON_DAYS) return 'warning';
  return 'info';
}

/** Strip di tepi kiri kartu agenda: merah hari ini, emas sampai 3 hari, netral sesudahnya. */
function stripClass(daysLeft: number): string {
  if (daysLeft <= 0) return 'bg-danger-fg';
  if (daysLeft <= URGENT_DAYS) return 'bg-gold-500';
  return 'bg-navy-300';
}

function Empty({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-navy-400">{children}</p>;
}

function SectionTitle({ children, aside }: { children: string; aside?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-4 w-1 rounded-control bg-gold-500" />
        <h2 className="text-base text-navy-800">{children}</h2>
      </div>
      {aside ? <span className="text-sm tabular-nums text-navy-400">{aside}</span> : null}
    </div>
  );
}

const CASE_COLUMNS: Column<RecentCase>[] = [
  {
    key: 'title',
    header: 'Perkara',
    cell: (r) => (
      <div>
        <Link href={`/cases/${r.id}`} className="font-medium text-navy-700 hover:underline">
          {r.title}
        </Link>
        <div className="text-xs tabular-nums text-navy-400">{r.regNo}</div>
      </div>
    ),
  },
  { key: 'status', header: 'Status', cell: (r) => <CaseStatusBadge status={r.status} /> },
  { key: 'startDate', header: 'Mulai', cell: (r) => formatDate(r.startDate) },
  { key: 'upaya', header: 'Batas upaya', cell: (r) => formatDate(r.upayaDeadline) },
];

export function DashboardView({
  data,
  recentCases = [],
  canCreateCase = false,
  now = new Date(),
}: {
  data: DashboardData;
  recentCases?: RecentCase[];
  canCreateCase?: boolean;
  now?: Date;
}) {
  const { cases, sidang7Hari, tenggat14Hari, surat, piutang, approvalMenungguSaya } = data;
  const today = todayWib(now);
  const totalCases = cases.activeCount + cases.completedCount;
  const buckets = deadlineBuckets(tenggat14Hari);
  const urgentCount = buckets.filter((b) => b.urgent).reduce((n, b) => n + b.count, 0);
  const load = scheduleLoad(sidang7Hari, today);
  const peak = Math.max(0, ...load.map((d) => d.count));
  const otherStatuses = cases.byStatus.filter((s) => s.status !== 'Aktif' && s.count > 0);

  return (
    <div>
      <PageHeader
        title="Ringkasan perkara dan persidangan"
        description={formatDate(now)}
        actions={canCreateCase ? <CreateCaseDialog /> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Perkara berjalan"
          value={cases.activeCount}
          note={`${cases.completedCount} perkara selesai`}
          visual={
            <Ring
              percent={percent(cases.activeCount, totalCases)}
              label={`${percent(cases.activeCount, totalCases)} persen dari seluruh perkara masih berjalan`}
            />
          }
          footer={otherStatuses.map((s) => `${s.status}: ${s.count}`)}
        />
        <KpiCard
          label="Tenggat mendesak"
          tone={urgentCount > 0 ? 'danger' : 'default'}
          value={urgentCount}
          note={`${tenggat14Hari.length} tenggat dalam 14 hari`}
          visual={
            <MiniBars
              bars={buckets}
              label={buckets.map((b) => `${b.label}: ${b.count}`).join(', ')}
            />
          }
          footer={buckets.filter((b) => b.count > 0).map((b) => `${b.label}: ${b.count}`)}
        />
        {piutang.authorized ? (
          <KpiCard
            label="Piutang belum lunas"
            value={formatRupiah(piutang.totalOutstanding)}
            note={`${piutang.invoiceCount ?? 0} invoice`}
          />
        ) : (
          <KpiCard
            label="Surat menunggu persetujuan Anda"
            value={approvalMenungguSaya.count}
            note={approvalMenungguSaya.count > 0 ? 'Perlu ditinjau' : 'Semua sudah ditinjau'}
          />
        )}
        <KpiCard
          label="Surat masuk belum selesai"
          value={surat.masukBelumSelesai}
          note={`Hari ini: ${surat.masukHariIni} masuk, ${surat.keluarHariIni} keluar`}
          visual={
            <Sparkline
              values={surat.trend6Bulan.map((t) => t.suratMasuk)}
              label={`Surat masuk 6 bulan terakhir: ${surat.trend6Bulan.map((t) => t.suratMasuk).join(', ')}`}
            />
          }
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section>
            <SectionTitle aside={`${sidang7Hari.length} agenda`}>
              Agenda sidang 7 hari ke depan
            </SectionTitle>
            {sidang7Hari.length === 0 ? (
              <div className="rounded-card border border-navy-200 bg-surface">
                <Empty>Tidak ada agenda sidang dalam 7 hari ke depan.</Empty>
              </div>
            ) : (
              <ul className="space-y-3">
                {sidang7Hari.map((s) => {
                  const daysLeft = daysBetween(today, s.scheduleDate);
                  return (
                    <li
                      key={s.id}
                      className="relative overflow-hidden rounded-card border border-navy-200 bg-surface p-5 pl-6"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 left-0 w-1 ${stripClass(daysLeft)}`}
                      />
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge tone={deadlineTone(daysLeft)}>
                          {daysLeft <= 0 ? 'Hari ini' : `H-${daysLeft}`}
                        </Badge>
                        <span className="tabular-nums text-navy-400">
                          {formatDate(s.scheduleDate)}
                          {s.scheduleTime ? `, ${s.scheduleTime.slice(0, 5)} WIB` : ''}
                        </span>
                      </div>
                      <Link
                        href={`/cases/${s.caseId}`}
                        className="mt-2 block font-display text-xl font-semibold text-navy-700 hover:underline"
                      >
                        {s.caseTitle}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 pt-3 text-sm text-navy-400">
                        <span>
                          {s.kind}, {s.location || 'lokasi belum ditentukan'}
                        </span>
                        <Badge tone="warning">{s.status}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle aside={`${tenggat14Hari.length} tenggat`}>
              Tenggat 14 hari ke depan
            </SectionTitle>
            <div className="rounded-card border border-navy-200 bg-surface px-5">
              {tenggat14Hari.length === 0 ? (
                <Empty>Tidak ada tenggat dalam 14 hari ke depan.</Empty>
              ) : (
                <ul className="divide-y divide-navy-100">
                  {tenggat14Hari.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={t.link}
                          className="text-sm font-medium text-navy-700 hover:underline"
                        >
                          {t.title}
                        </Link>
                        {t.extraInfo ? (
                          <p className="text-xs text-navy-400">{t.extraInfo}</p>
                        ) : null}
                      </div>
                      <Badge tone={deadlineTone(t.daysLeft)}>
                        {t.daysLeft === 0 ? 'Hari ini' : `H-${t.daysLeft}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card
            title="Beban sidang 7 hari ke depan"
            action={
              <span className="text-sm tabular-nums text-navy-400">
                Total: {sidang7Hari.length}
              </span>
            }
          >
            <ul className="flex h-36 items-end justify-between gap-2">
              {load.map((d) => (
                <li
                  key={d.date}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span
                    className={`text-xs tabular-nums ${d.count > 0 && d.count === peak ? 'font-semibold text-gold-700' : 'text-navy-400'}`}
                  >
                    {d.count}
                    <span className="sr-only"> sidang pada {formatDate(d.date)}</span>
                  </span>
                  <div
                    aria-hidden="true"
                    style={{ height: `${peak > 0 ? Math.max((d.count / peak) * 100, 4) : 4}%` }}
                    className={`w-full rounded-t-control ${d.count > 0 && d.count === peak ? 'bg-gold-500' : 'bg-navy-200'}`}
                  />
                  <span className="text-xs text-navy-400">{d.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Berapa perkara di tiap status?">
            <CasesStatusChart byStatus={cases.byStatus} />
          </Card>
        </div>
      </div>

      <section className="mt-8">
        <SectionTitle>Perkara terbaru</SectionTitle>
        <div className="overflow-hidden rounded-card border border-navy-200 bg-surface">
          {recentCases.length === 0 ? (
            <Empty>Belum ada perkara yang dapat Anda lihat.</Empty>
          ) : (
            <ResponsiveTable
              caption="Perkara terbaru"
              columns={CASE_COLUMNS}
              rows={recentCases}
              rowKey={(r) => r.id}
            />
          )}
          <div className="border-t border-navy-200 px-4 py-3 text-right">
            <Link href="/cases" className={buttonClass.ghost}>
              Lihat semua perkara
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card
          title="Surat menunggu persetujuan Anda"
          action={
            <Badge tone={approvalMenungguSaya.count > 0 ? 'warning' : 'neutral'}>
              {approvalMenungguSaya.count}
            </Badge>
          }
        >
          {approvalMenungguSaya.items.length === 0 ? (
            <Empty>Semua surat sudah ditinjau atau ditandatangani.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {approvalMenungguSaya.items.map((a) => (
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
                    <span className="font-medium">{act.userName || 'Sistem'}</span> {act.action}{' '}
                    pada {act.module}
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

      <div className="mt-6">
        <Card title="Surat masuk dan keluar, 6 bulan terakhir">
          <SuratTrendChart trend6Bulan={surat.trend6Bulan} />
        </Card>
      </div>
    </div>
  );
}
