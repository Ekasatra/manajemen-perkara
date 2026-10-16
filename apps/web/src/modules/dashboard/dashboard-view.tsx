import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Activity,
  AlarmClock,
  ArrowRight,
  Bell,
  BellOff,
  BellRing,
  Briefcase,
  CalendarCheck,
  ChartColumn,
  ChartPie,
  CircleCheck,
  CornerDownRight,
  Gavel,
  Inbox,
  Mail,
  MapPin,
  PenTool,
  Undo2,
  Upload,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { DashboardData } from '@ekasatra/shared';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { buttonClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import { avatarColor } from '@/lib/avatar';
import { CreateCaseDialog } from '@/modules/cases/create-case-dialog';
import { MailBars, StatusDonut } from './charts';
import { daysBetween, todayWib } from './metrics';
import { StatCard } from './stat-card';
import type { StatTone } from './stat-card';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const NOTIF_ICON = {
  approval: PenTool,
  disposisi: CornerDownRight,
  reject: Undo2,
  sidang: Gavel,
} as const;
const TENGGAT_LABEL = {
  upaya_hukum: 'Upaya Hukum',
  sidang: 'Sidang',
  invoice: 'Jatuh Tempo',
} as const;

export type DashboardViewer = {
  name: string;
  roleLabel: string;
  canCreateCase: boolean;
  canCreateSuratMasuk: boolean;
  canCreateSuratKeluar: boolean;
  canReadAudit: boolean;
};

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(now),
  );
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function relTime(iso: string, now: Date): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(iso);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function SectionTitle({
  icon,
  children,
  action,
}: {
  icon: ReactNode;
  children: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-navy-800">
        <span aria-hidden="true" className="text-gold-500">
          {icon}
        </span>
        {children}
      </h2>
      {action}
    </div>
  );
}

function Empty({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-sm text-navy-400">
      <span aria-hidden="true" className="text-navy-300">
        {icon}
      </span>
      {children}
    </div>
  );
}

function leftBadge(daysLeft: number): { tone: BadgeTone; label: string } {
  if (daysLeft <= 0) return { tone: 'danger', label: 'Hari ini' };
  if (daysLeft === 1) return { tone: 'warning', label: 'Besok' };
  return { tone: 'neutral', label: `H-${daysLeft}` };
}

export function DashboardView({
  data,
  viewer,
  now = new Date(),
}: {
  data: DashboardData;
  viewer: DashboardViewer;
  now?: Date;
}) {
  const { cases, sidang7Hari, tenggat14Hari, surat, piutang, approvalMenungguSaya } = data;
  const today = todayWib(now);
  const firstName = viewer.name.split(/\s+/)[0] ?? viewer.name;
  const nearest = sidang7Hari[0];

  const stats: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    sub: ReactNode;
    tone: StatTone;
    href?: string;
  }[] = [
    {
      icon: <Briefcase size={18} />,
      label: 'Perkara Aktif',
      value: cases.activeCount,
      sub: 'Aktif · Putus · Upaya hukum',
      tone: 'navy',
      href: '/cases',
    },
    {
      icon: <CircleCheck size={18} />,
      label: 'Perkara Selesai',
      value: cases.completedCount,
      sub: 'telah berkekuatan hukum tetap',
      tone: 'slate',
      href: '/cases',
    },
    {
      icon: <Gavel size={18} />,
      label: 'Sidang 7 Hari',
      value: sidang7Hari.length,
      sub: nearest ? `terdekat ${formatDate(nearest.scheduleDate)}` : 'tidak ada jadwal',
      tone: 'gold',
    },
    {
      icon: <Mail size={18} />,
      label: 'Surat Hari Ini',
      value: surat.masukHariIni + surat.keluarHariIni,
      sub: `${surat.masukHariIni} masuk · ${surat.keluarHariIni} keluar`,
      tone: 'sky',
      href: '/surat-masuk',
    },
    piutang.authorized
      ? {
          icon: <Wallet size={18} />,
          label: 'Biaya Perkara Tertagih',
          value: <span className="text-lg">{formatRupiah(piutang.totalOutstanding ?? 0)}</span>,
          sub: `${piutang.invoiceCount ?? 0} invoice`,
          tone: 'emerald',
          href: '/invoices',
        }
      : {
          icon: <Inbox size={18} />,
          label: 'Surat Belum Selesai',
          value: surat.masukBelumSelesai,
          sub: 'surat masuk perlu diproses',
          tone: 'emerald',
          href: '/surat-masuk',
        },
    {
      icon: <UserPlus size={18} />,
      label: 'Klien Baru',
      value: data.klienBaruBulanIni,
      sub: 'bulan ini',
      tone: 'indigo',
      href: '/clients',
    },
    {
      icon: <AlarmClock size={18} />,
      label: 'Deadline',
      value: tenggat14Hari.length,
      sub: 'upaya hukum, sidang & jatuh tempo',
      tone: 'rose',
    },
    {
      icon: <BellRing size={18} />,
      label: 'Notifikasi',
      value: data.notifikasiPersonal.length,
      sub: approvalMenungguSaya.count
        ? `${approvalMenungguSaya.count} surat menunggu Anda`
        : 'untuk Anda',
      tone: 'amber',
      href: '/#pemberitahuan',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-700">
            {viewer.roleLabel}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-navy-800">
            {greeting(now)}, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-navy-400">{formatDate(now)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewer.canCreateSuratMasuk ? (
            <Link href="/surat-masuk" className={buttonClass.secondary}>
              <Inbox aria-hidden="true" size={15} /> Catat Surat Masuk
            </Link>
          ) : null}
          {viewer.canCreateSuratKeluar ? (
            <Link href="/surat-keluar" className={buttonClass.secondary}>
              <Upload aria-hidden="true" size={15} /> Unggah Surat Keluar
            </Link>
          ) : null}
          {viewer.canCreateCase ? <CreateCaseDialog /> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="card-surface p-5 xl:col-span-2">
          <SectionTitle
            icon={<Gavel size={16} />}
            action={
              <Link
                href="/jadwal"
                className={`${buttonClass.secondary} min-h-9 px-3 py-1.5 text-xs`}
              >
                Kalender <ArrowRight aria-hidden="true" size={15} />
              </Link>
            }
          >
            Jadwal Sidang 7 Hari ke Depan
          </SectionTitle>
          {sidang7Hari.length === 0 ? (
            <Empty icon={<CalendarCheck size={28} />}>Tidak ada sidang dalam 7 hari ke depan</Empty>
          ) : (
            <ul className="divide-y divide-navy-50">
              {sidang7Hari.map((s) => {
                const left = daysBetween(today, s.scheduleDate);
                const badge = leftBadge(left);
                const month = MONTHS[Number(s.scheduleDate.slice(5, 7)) - 1] ?? '';
                return (
                  <li key={s.id}>
                    <Link
                      href={`/cases/${s.caseId}`}
                      className="-mx-2 flex items-center gap-4 rounded-control px-2 py-3 hover:bg-gold-50/40"
                    >
                      <div className="w-14 shrink-0 rounded-control bg-navy-700 py-1.5 text-center text-white dark:bg-gold-500 dark:text-navy-950">
                        <div className="text-[10px] uppercase tracking-wider text-gold-300 dark:text-navy-950">
                          {month}
                        </div>
                        <div className="text-xl font-bold leading-none">
                          {Number(s.scheduleDate.slice(8, 10))}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-navy-800">
                          {s.caseTitle}
                        </div>
                        <div className="truncate text-xs text-navy-400">{s.kind}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-navy-500">
                          <MapPin aria-hidden="true" size={13} />
                          {s.location || '—'}
                          {s.scheduleTime ? ` · ${s.scheduleTime.slice(0, 5)} WIB` : ''}
                        </div>
                      </div>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="pemberitahuan" className="card-surface scroll-mt-24 p-5">
          <SectionTitle icon={<BellRing size={16} />}>Notifikasi</SectionTitle>
          {data.notifikasiPersonal.length === 0 ? (
            <Empty icon={<BellOff size={28} />}>Tidak ada notifikasi baru</Empty>
          ) : (
            <ul className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {data.notifikasiPersonal.map((n) => {
                const Icon = NOTIF_ICON[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <Link
                      href={n.link}
                      className="flex gap-3 rounded-control p-2.5 hover:bg-gold-50/50"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                        <Icon aria-hidden="true" size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-semibold text-navy-800">
                          {n.title}
                        </div>
                        <div className="line-clamp-1 text-xs text-navy-500">{n.description}</div>
                        <div className="mt-0.5 text-[11px] text-navy-400">
                          {relTime(n.date, now)}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <section className="card-surface p-5">
          <SectionTitle icon={<ChartPie size={16} />}>Perkara per Status</SectionTitle>
          <StatusDonut byStatus={cases.byStatus} />
        </section>
        <section className="card-surface p-5">
          <SectionTitle icon={<ChartColumn size={16} />}>Volume Surat 6 Bulan</SectionTitle>
          <MailBars trend={surat.trend6Bulan} />
        </section>
        <section className="card-surface p-5 lg:col-span-2 xl:col-span-1">
          <SectionTitle icon={<AlarmClock size={16} />}>Deadline Mendatang</SectionTitle>
          {tenggat14Hari.length === 0 ? (
            <Empty icon={<CalendarCheck size={28} />}>Tidak ada deadline dekat</Empty>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {tenggat14Hari.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.link}
                    className="flex items-center gap-3 rounded-control p-1.5 text-sm hover:bg-gold-50/40"
                  >
                    <span className="w-24 shrink-0 text-center">
                      <Badge tone={t.type === 'upaya_hukum' ? 'danger' : 'neutral'}>
                        {TENGGAT_LABEL[t.type]}
                      </Badge>
                    </span>
                    <span className="flex-1 truncate text-navy-700">{t.title}</span>
                    <span
                      className={`text-xs ${t.daysLeft <= 1 ? 'font-semibold text-danger-fg' : 'text-navy-400'}`}
                    >
                      {t.daysLeft === 0
                        ? 'Hari ini'
                        : t.daysLeft < 0
                          ? `${Math.abs(t.daysLeft)} hr lewat`
                          : `${t.daysLeft} hari`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card-surface mt-4 p-5">
        <SectionTitle
          icon={<Activity size={16} />}
          action={
            viewer.canReadAudit ? (
              <Link
                href="/audit"
                className={`${buttonClass.secondary} min-h-9 px-3 py-1.5 text-xs`}
              >
                Audit log <ArrowRight aria-hidden="true" size={15} />
              </Link>
            ) : undefined
          }
        >
          Aktivitas Terbaru
        </SectionTitle>
        {data.aktivitasTerbaru.length === 0 ? (
          <Empty icon={<Activity size={28} />}>Belum ada aktivitas</Empty>
        ) : (
          <ul className="grid gap-x-8 md:grid-cols-2">
            {data.aktivitasTerbaru.map((a) => {
              const name = a.userName || 'Sistem';
              return (
                <li key={a.id} className="flex gap-3 border-b border-navy-50 py-2.5">
                  <span
                    aria-hidden="true"
                    className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${avatarColor(name)}`}
                  >
                    {initials(name)}
                  </span>
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold">{name}</span>{' '}
                    <span className="text-navy-400">
                      · {a.action} · {a.module}
                    </span>
                    <div className="truncate text-navy-600">{a.description}</div>
                    <div className="text-[11px] text-navy-400">{relTime(a.createdAt, now)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
