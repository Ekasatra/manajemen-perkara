'use client';

import React, { useState, useEffect } from 'react';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

export type ReportTab = 'cases' | 'surat-masuk' | 'surat-keluar' | 'honorarium' | 'schedules';

/** Baris laporan beragam per tab; hanya nilai skalar yang dirender. */
interface ReportRow {
  id: string;
  [field: string]: string | number | null | undefined;
}

export function ReportsView() {
  const [tab, setTab] = useState<ReportTab>('cases');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportRow[]>([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status) params.set('status', status);

      const res = await fetch(`/api/v1/reports/${tab}?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muat ulang saat ganti tab
    fetchReport();
  }, [tab]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (status) params.set('status', status);
    params.set('format', 'csv');

    window.open(`/api/v1/reports/${tab}?${params.toString()}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-800">
            Laporan Operasional
          </h1>
          <p className="text-sm text-gray-500">
            Modul laporan terpadu dan rekapitulasi data (Khusus Administrator).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className={buttonClass.secondary}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className={buttonClass.primary}
          >
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: 'cases', label: 'Perkara' },
            { id: 'surat-masuk', label: 'Surat Masuk' },
            { id: 'surat-keluar', label: 'Surat Keluar' },
            { id: 'honorarium', label: 'Honorarium' },
            { id: 'schedules', label: 'Jadwal & Sidang' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as ReportTab);
                setStatus('');
              }}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-navy-700 text-navy-800'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 3. Filters Bar */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:items-end">
        <div>
          <label className={labelClass}>Tanggal Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Tanggal Akhir</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <input
            type="text"
            placeholder="Filter status..."
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className={`w-full ${buttonClass.primary}`}
          >
            {loading ? 'Memuat...' : 'Terapkan Filter'}
          </button>
        </div>
      </div>

      {/* 4. Table Display */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {tab === 'cases' && (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">No. Reg</th>
                  <th className="px-4 py-3">Judul Perkara</th>
                  <th className="px-4 py-3">Klien</th>
                  <th className="px-4 py-3">Pengadilan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tgl Mulai</th>
                  <th className="px-4 py-3">Batas Upaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Tidak ada data perkara untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  data.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-navy-800">{c.regNo}</td>
                      <td className="px-4 py-3">{c.title}</td>
                      <td className="px-4 py-3 text-gray-600">{c.clientName}</td>
                      <td className="px-4 py-3 text-gray-500">{c.court || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.startDate || '-'}</td>
                      <td className="px-4 py-3 font-medium text-red-600">{c.upayaDeadline || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === 'surat-masuk' && (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">No. Agenda</th>
                  <th className="px-4 py-3">Pengirim</th>
                  <th className="px-4 py-3">Perihal</th>
                  <th className="px-4 py-3">Tgl Terima</th>
                  <th className="px-4 py-3">Sifat</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Disposisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Tidak ada data surat masuk.
                    </td>
                  </tr>
                ) : (
                  data.map((sm) => (
                    <tr key={sm.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-navy-800">{sm.noAgenda}</td>
                      <td className="px-4 py-3">{sm.sender}</td>
                      <td className="px-4 py-3">{sm.subject}</td>
                      <td className="px-4 py-3 text-gray-500">{sm.tglTerima}</td>
                      <td className="px-4 py-3">{sm.sifat}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {sm.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{sm.assignedToName || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === 'surat-keluar' && (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">No. Surat</th>
                  <th className="px-4 py-3">Perihal</th>
                  <th className="px-4 py-3">Tujuan</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tgl Surat</th>
                  <th className="px-4 py-3">Perkara</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Tidak ada data surat keluar.
                    </td>
                  </tr>
                ) : (
                  data.map((sk) => (
                    <tr key={sk.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-navy-800">{sk.noSurat || '(Draft)'}</td>
                      <td className="px-4 py-3">{sk.subject}</td>
                      <td className="px-4 py-3 text-gray-600">{sk.destination}</td>
                      <td className="px-4 py-3">{sk.jenis}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {sk.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{sk.tglSurat || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{sk.caseTitle || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === 'honorarium' && (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Perkara</th>
                  <th className="px-4 py-3">Anggota Tim</th>
                  <th className="px-4 py-3">Draft (Rp)</th>
                  <th className="px-4 py-3">Publish (Rp)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tgl Publish</th>
                  <th className="px-4 py-3">Tgl Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Tidak ada data honorarium.
                    </td>
                  </tr>
                ) : (
                  data.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-navy-800">{h.caseTitle}</td>
                      <td className="px-4 py-3">{h.userName}</td>
                      <td className="px-4 py-3 text-gray-500">{h.draftAmount?.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 font-medium text-emerald-700">
                        {h.publishedAmount ? h.publishedAmount.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{String(h.publishedAt ?? '').slice(0, 10) || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{String(h.paidAt ?? '').slice(0, 10) || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === 'schedules' && (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Tanggal & Waktu</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Perkara</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Tidak ada data jadwal.
                    </td>
                  </tr>
                ) : (
                  data.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-navy-800">
                        {s.scheduleDate} {s.scheduleTime ? `• ${s.scheduleTime}` : ''}
                      </td>
                      <td className="px-4 py-3">{s.kind}</td>
                      <td className="px-4 py-3">{s.caseTitle}</td>
                      <td className="px-4 py-3 text-gray-600">{s.location || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.notes || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

