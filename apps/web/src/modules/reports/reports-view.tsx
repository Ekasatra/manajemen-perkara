'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
type TabDef = { id: ReportTab; label: string; empty: string; columns: Column[] };

const dateOrDash = (v: ReportRow[string]) => (v ? formatDate(String(v)) : '-');
const textOrDash = (v: ReportRow[string]) => (v === null || v === undefined || v === '' ? '-' : v);
const rupiahOrDash = (v: ReportRow[string]) => (typeof v === 'number' ? formatRupiah(v) : '-');

/** Definisi kolom per tab: kolom penentu (nomor) di depan, tanggal dan nominal dari formatter bersama. */
const TABS: TabDef[] = [
  {
    id: 'cases',
    label: 'Perkara',
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
    label: 'Jadwal & Sidang',
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

export function ReportsView() {
  const [tab, setTab] = useState<ReportTab>('cases');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportRow[]>([]);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0]!;

  const query = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status) params.set('status', status);
      for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
      return params.toString();
    },
    [startDate, endDate, status],
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
        title="Laporan"
        description="Rekapitulasi data perkara, surat, honorarium, dan jadwal. Hanya Admin yang dapat melihatnya."
        actions={
          <>
            <button
              type="button"
              onClick={() => window.open(`/api/v1/reports/${tab}?${query({ format: 'csv' })}`, '_blank')}
              className={buttonClass.secondary}
            >
              Ekspor CSV
            </button>
            <button type="button" onClick={() => window.print()} className={buttonClass.primary}>
              Cetak laporan
            </button>
          </>
        }
      />

      <div role="tablist" aria-label="Jenis laporan" className="flex gap-1 overflow-x-auto border-b border-navy-200 print:hidden">
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
            }}
            className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors md:min-h-9 ${
              tab === t.id
                ? 'border-navy-700 text-navy-800'
                : 'border-transparent text-navy-400 hover:border-navy-300 hover:text-navy-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void fetchReport();
        }}
        className="mt-4 grid gap-4 rounded-card border border-navy-200 bg-surface p-4 sm:grid-cols-4 sm:items-end print:hidden"
      >
        <div>
          <label htmlFor="r-start" className={labelClass}>
            Tanggal mulai
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
            Tanggal akhir
          </label>
          <input
            id="r-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="r-status" className={labelClass}>
            Status
          </label>
          <input
            id="r-status"
            type="text"
            placeholder="Contoh: Aktif"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={loading} className={`w-full ${buttonClass.primary}`}>
          {loading ? 'Memuat…' : 'Terapkan filter'}
        </button>
      </form>

      <div
        role="tabpanel"
        id="panel-laporan"
        aria-labelledby={`tab-${active.id}`}
        aria-busy={loading}
        className="mt-4 overflow-hidden rounded-card border border-navy-200 bg-surface"
      >
        {loading ? (
          <LoadingState label="Memuat laporan…" />
        ) : data.length === 0 ? (
          <EmptyState title={active.empty} hint="Ubah rentang tanggal atau status, lalu terapkan lagi." />
        ) : (
          <ResponsiveTable
            caption={`Laporan ${active.label}`}
            columns={active.columns.map((c) => ({ ...c, key: c.header }))}
            rows={data}
            rowKey={(r) => r.id}
          />
        )}
      </div>
    </div>
  );
}
