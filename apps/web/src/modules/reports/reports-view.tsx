'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FileDown,
  Filter,
  Inbox,
  Send,
  Wallet,
} from 'lucide-react';
import { StatTile } from '@/components/ui/stat-tile';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import { EmptyState, LoadingState } from '@/shell/states';

export type ReportTab = 'cases' | 'surat-masuk' | 'surat-keluar' | 'honorarium' | 'schedules';

/** Baris laporan beragam per tab; hanya nilai skalar yang dirender. */
interface ReportRow {
  id: string;
  [field: string]: string | number | null | undefined;
}

type Column = { header: string; cell: (r: ReportRow) => ReactNode; align?: 'right' };
type TabDef = {
  id: ReportTab;
  label: string;
  icon: LucideIcon;
  empty: string;
  columns: Column[];
  statuses: readonly string[];
  /** Filter tambahan khusus tab; nama parameter mengikuti API laporan. */
  extra?: { param: string; label: string; options: readonly string[] };
};

const dateOrDash = (v: ReportRow[string]) => (v ? formatDate(String(v)) : '-');
const textOrDash = (v: ReportRow[string]) => (v === null || v === undefined || v === '' ? '-' : v);
const rupiahOrDash = (v: ReportRow[string]) => (typeof v === 'number' ? formatRupiah(v) : '-');

/** Definisi kolom per tab: kolom penentu (nomor) di depan, tanggal dan nominal dari formatter bersama. */
const TABS: TabDef[] = [
  {
    id: 'cases',
    label: 'Perkara',
    icon: Briefcase,
    statuses: ['Aktif', 'Putus', 'Banding', 'Kasasi', 'PK', 'Selesai'],
    empty: 'Tidak ada perkara untuk filter ini.',
    columns: [
      { header: 'No. Reg', cell: (r) => <span className="font-medium">{r.regNo}</span> },
      { header: 'Judul perkara', cell: (r) => r.title },
      { header: 'Klien', cell: (r) => r.clientName },
      { header: 'Pengadilan', cell: (r) => textOrDash(r.court) },
      { header: 'Status', cell: (r) => <Badge tone="info">{String(r.status)}</Badge> },
      { header: 'Tanggal mulai', cell: (r) => dateOrDash(r.startDate) },
      { header: 'Batas upaya', cell: (r) => dateOrDash(r.upayaDeadline) },
    ],
  },
  {
    id: 'surat-masuk',
    label: 'Surat Masuk',
    icon: Inbox,
    statuses: ['Belum', 'Didisposisi', 'Selesai'],
    extra: { param: 'sifat', label: 'Sifat', options: ['Biasa', 'Penting', 'Segera', 'Rahasia'] },
    empty: 'Tidak ada surat masuk untuk filter ini.',
    columns: [
      { header: 'No. agenda', cell: (r) => <span className="font-medium">{r.noAgenda}</span> },
      { header: 'Pengirim', cell: (r) => r.sender },
      { header: 'Perihal', cell: (r) => r.subject },
      { header: 'Tanggal terima', cell: (r) => dateOrDash(r.tglTerima) },
      { header: 'Sifat', cell: (r) => r.sifat },
      { header: 'Status', cell: (r) => <Badge tone="info">{String(r.status)}</Badge> },
      { header: 'Disposisi', cell: (r) => textOrDash(r.assignedToName) },
    ],
  },
  {
    id: 'surat-keluar',
    label: 'Surat Keluar',
    icon: Send,
    statuses: ['Draft', 'Review', 'Siap_TTD', 'Ditandatangani', 'Terkirim'],
    extra: { param: 'jenis', label: 'Jenis surat', options: ['Perkara', 'Instansi'] },
    empty: 'Tidak ada surat keluar untuk filter ini.',
    columns: [
      {
        header: 'No. surat',
        cell: (r) => <span className="font-medium">{r.noSurat || 'Draft'}</span>,
      },
      { header: 'Perihal', cell: (r) => r.subject },
      { header: 'Tujuan', cell: (r) => r.destination },
      { header: 'Jenis', cell: (r) => r.jenis },
      { header: 'Status', cell: (r) => <Badge tone="info">{String(r.status)}</Badge> },
      { header: 'Tanggal surat', cell: (r) => dateOrDash(r.tglSurat) },
      { header: 'Perkara', cell: (r) => textOrDash(r.caseTitle) },
    ],
  },
  {
    id: 'honorarium',
    label: 'Honorarium',
    icon: Wallet,
    statuses: ['Belum', 'Dibayar'],
    empty: 'Tidak ada honorarium untuk filter ini.',
    columns: [
      { header: 'Perkara', cell: (r) => <span className="font-medium">{r.caseTitle}</span> },
      { header: 'Anggota tim', cell: (r) => r.userName },
      { header: 'Draft', align: 'right', cell: (r) => rupiahOrDash(r.draftAmount) },
      { header: 'Terdistribusi', align: 'right', cell: (r) => rupiahOrDash(r.publishedAmount) },
      { header: 'Status', cell: (r) => <Badge tone="neutral">{String(r.status)}</Badge> },
      { header: 'Tanggal distribusi', cell: (r) => dateOrDash(r.publishedAt) },
      { header: 'Tanggal bayar', cell: (r) => dateOrDash(r.paidAt) },
    ],
  },
  {
    id: 'schedules',
    label: 'Jadwal Sidang',
    icon: CalendarDays,
    statuses: ['Terjadwal', 'Selesai', 'Ditunda'],
    empty: 'Tidak ada jadwal untuk filter ini.',
    columns: [
      {
        header: 'Tanggal dan waktu',
        cell: (r) => (
          <span className="font-medium">
            {dateOrDash(r.scheduleDate)}
            {r.scheduleTime ? `, ${r.scheduleTime}` : ''}
          </span>
        ),
      },
      { header: 'Jenis', cell: (r) => r.kind },
      { header: 'Perkara', cell: (r) => r.caseTitle },
      { header: 'Lokasi', cell: (r) => textOrDash(r.location) },
      { header: 'Catatan', cell: (r) => textOrDash(r.notes) },
      { header: 'Status', cell: (r) => <Badge tone="warning">{String(r.status)}</Badge> },
    ],
  },
];

/** Batang horizontal jumlah baris per status; angka selalu tertulis di samping batang. */
function StatusBars({ rows }: { rows: ReportRow[] }) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = String(r.status ?? '-');
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const entries = [...counts.entries()];
  const max = Math.max(...entries.map(([, n]) => n));
  return (
    <ul className="space-y-2">
      {entries.map(([label, n], i) => (
        <li key={label} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 text-navy-600">{label.replace('_', ' ')}</span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-navy-100">
            <span
              className={`block h-full rounded-full ${i % 2 ? 'bg-gold-500' : 'bg-navy-700'}`}
              style={{ width: `${(n / max) * 100}%` }}
            />
          </span>
          <span className="w-8 text-right font-semibold tabular-nums text-navy-800">{n}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportsView({
  clients,
  cases,
}: {
  clients: { id: string; label: string }[];
  cases: { id: string; label: string }[];
}) {
  const [tab, setTab] = useState<ReportTab>('cases');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [extra, setExtra] = useState('');
  const [progressCase, setProgressCase] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportRow[]>([]);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0]!;

  const query = useCallback(
    (more?: Record<string, string>) => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status) params.set('status', status);
      if (tab === 'cases' && clientId) params.set('clientId', clientId);
      if (active.extra && extra) params.set(active.extra.param, extra);
      for (const [k, v] of Object.entries(more ?? {})) params.set(k, v);
      return params.toString();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `active` diturunkan dari `tab`
    [startDate, endDate, status, clientId, extra, tab],
  );

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/reports/${tab}?${query()}`);
      const json = await res.json();
      setData(json.ok ? json.data : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muat ulang saat ganti tab
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat tab berganti; filter diterapkan lewat tombol
  }, [tab]);

  return (
    <div>
      <PageHeader
        title="Laporan & Export"
        description="Filter, lalu ekspor ke CSV atau cetak ke PDF."
        actions={
          <>
            <button
              type="button"
              onClick={() =>
                window.open(`/api/v1/reports/${tab}?${query({ format: 'csv' })}`, '_blank')
              }
              className={buttonClass.secondary}
            >
              <FileDown aria-hidden="true" size={15} /> CSV
            </button>
            <button type="button" onClick={() => window.print()} className={buttonClass.primary}>
              PDF (cetak)
            </button>
          </>
        }
      />

      <div
        role="tablist"
        aria-label="Jenis laporan"
        className="mb-4 flex w-full gap-1 overflow-x-auto rounded-control border border-navy-100 bg-surface/60 p-1 sm:w-fit print:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="panel-laporan"
            onClick={() => {
              setTab(t.id);
              setStatus('');
              setExtra('');
            }}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition md:min-h-9 ${
              tab === t.id
                ? 'bg-surface text-navy-800 shadow-soft'
                : 'text-navy-500 hover:bg-surface/70 hover:text-navy-800'
            }`}
          >
            <t.icon aria-hidden="true" size={15} /> {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void fetchReport();
        }}
        className="card-surface mb-4 grid grid-cols-2 items-end gap-x-4 gap-y-5 p-4 md:grid-cols-3 xl:grid-cols-6 print:hidden"
      >
        <div>
          <label htmlFor="r-start" className={labelClass}>
            Dari tanggal
          </label>
          <input
            id="r-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="r-end" className={labelClass}>
            Sampai tanggal
          </label>
          <input
            id="r-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
        {tab === 'cases' ? (
          <div>
            <label htmlFor="r-client" className={labelClass}>
              Klien
            </label>
            <select
              id="r-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
            >
              <option value="">Semua klien</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor="r-status" className={labelClass}>
            Status
          </label>
          <select
            id="r-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="">Semua status</option>
            {active.statuses.map((st) => (
              <option key={st} value={st}>
                {st.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        {active.extra ? (
          <div>
            <label htmlFor="r-extra" className={labelClass}>
              {active.extra.label}
            </label>
            <select
              id="r-extra"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              className={inputClass}
            >
              <option value="">Semua</option>
              {active.extra.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ) : null}
        <button type="submit" disabled={loading} className={buttonClass.primary}>
          <Filter aria-hidden="true" size={15} /> {loading ? 'Memuat…' : 'Tampilkan'}
        </button>
      </form>

      {!loading && data.length > 0 ? (
        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <StatTile
            label="Jumlah Data"
            value={<span className="text-2xl">{data.length}</span>}
            note={`Laporan ${active.label}`}
          />
          <section className="card-surface p-5 lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-800">
              <ChartColumn aria-hidden="true" size={16} className="text-gold-500" /> Distribusi
              Status
            </h2>
            <StatusBars rows={data} />
          </section>
        </div>
      ) : null}

      <div
        role="tabpanel"
        id="panel-laporan"
        aria-labelledby={`tab-${active.id}`}
        aria-busy={loading}
        className="mt-4 overflow-hidden card-surface"
      >
        {loading ? (
          <LoadingState label="Memuat laporan…" />
        ) : data.length === 0 ? (
          <EmptyState
            title={active.empty}
            hint="Ubah rentang tanggal atau status, lalu terapkan lagi."
          />
        ) : (
          <ResponsiveTable
            caption={`Laporan ${active.label}`}
            columns={active.columns.map((c) => ({ ...c, key: c.header }))}
            rows={data}
            rowKey={(r) => r.id}
          />
        )}
      </div>

      <section className="card-surface mt-4 p-5 print:hidden">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-navy-800">
          <ClipboardList aria-hidden="true" size={16} className="text-gold-500" /> Laporan Progress
          per Perkara
        </h2>
        <p className="mb-4 text-sm text-navy-500">
          Ringkasan eksekutif: status, tim, jadwal terdekat, kronologi, dokumen, dan honorarium
          (PDF).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="r-case" className="sr-only">
            Pilih perkara
          </label>
          <select
            id="r-case"
            value={progressCase}
            onChange={(e) => setProgressCase(e.target.value)}
            className={`${inputClass} flex-1`}
          >
            <option value="">Pilih perkara</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!progressCase}
            onClick={() => window.open(`/api/v1/reports/cases/${progressCase}/pdf`, '_blank')}
            className={buttonClass.gold}
          >
            <FileDown aria-hidden="true" size={15} /> Buat Laporan
          </button>
        </div>
      </section>
    </div>
  );
}
