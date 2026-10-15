'use client';

import React from 'react';
import Link from 'next/link';
import type { DashboardData } from '@ekasatra/shared';
import { CasesStatusChart, SuratTrendChart } from './charts';

export function DashboardView({ data }: { data: DashboardData }) {
  const formatRupiah = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-800">
          Dashboard Ekasatra
        </h1>
        <p className="text-sm text-gray-500">
          Ringkasan perkara, jadwal sidang, surat, dan aktivitas operasional kantor.
        </p>
      </div>

      {/* 2. Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Perkara Aktif & Selesai */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Perkara Aktif
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {data.cases.completedCount} Selesai
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-800">
              {data.cases.activeCount}
            </span>
            <span className="text-xs text-gray-400">perkara berjalan</span>
          </div>
        </div>

        {/* Sidang 7 Hari ke Depan */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Sidang 7 Hari
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Mendatang
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-navy-800">
              {data.sidang7Hari.length}
            </span>
            <span className="text-xs text-gray-400">agenda terjadwal</span>
          </div>
        </div>

        {/* Surat Masuk & Keluar Hari Ini */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Surat Hari Ini
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {data.surat.masukBelumSelesai} Belum Selesai
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-navy-800">
                {data.surat.masukHariIni}
              </span>
              <span className="ml-1 text-xs text-gray-400">Masuk</span>
            </div>
            <span className="text-gray-300">/</span>
            <div>
              <span className="text-2xl font-bold text-[#B38B4D]">
                {data.surat.keluarHariIni}
              </span>
              <span className="ml-1 text-xs text-gray-400">Keluar</span>
            </div>
          </div>
        </div>

        {/* Piutang (jika berhak) atau Klien Baru */}
        {data.piutang.authorized ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Piutang
              </span>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                {data.piutang.invoiceCount} Tagihan
              </span>
            </div>
            <div className="mt-3">
              <div className="truncate text-xl font-bold text-navy-800">
                {formatRupiah(data.piutang.totalOutstanding)}
              </div>
              <span className="text-xs text-gray-400">belum terlunasi</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Klien Baru
              </span>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                Bulan Ini
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-navy-800">
                {data.klienBaruBulanIni}
              </span>
              <span className="text-xs text-gray-400">klien terdaftar</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Perkara */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-800">
            Distribusi Status Perkara
          </h2>
          <CasesStatusChart byStatus={data.cases.byStatus} />
        </div>

        {/* Tren Surat 6 Bulan */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-800">
            Tren Surat (6 Bulan Terakhir)
          </h2>
          <SuratTrendChart trend6Bulan={data.surat.trend6Bulan} />
        </div>
      </div>

      {/* 4. Actionable Sections (Approval Menunggu & Tenggat 14 Hari) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom 1 & 2: Jadwal Sidang & Tenggat */}
        <div className="space-y-6 lg:col-span-2">
          {/* Sidang 7 Hari ke Depan */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-navy-800">
                Jadwal Sidang 7 Hari ke Depan
              </h2>
              <span className="text-xs text-gray-400">
                {data.sidang7Hari.length} agenda
              </span>
            </div>

            {data.sidang7Hari.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Tidak ada agenda sidang dalam 7 hari ke depan.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.sidang7Hari.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <Link
                        href={`/cases/${s.caseId}`}
                        className="font-medium text-navy-800 hover:text-navy-600 hover:underline"
                      >
                        {s.caseTitle}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {s.kind} • {s.location || 'Lokasi belum ditentukan'}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-semibold text-amber-700">
                        {s.scheduleDate} {s.scheduleTime ? `• ${s.scheduleTime} WIB` : ''}
                      </div>
                      <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tenggat 14 Hari */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-800">
              Peringatan Tenggat (14 Hari ke Depan)
            </h2>

            {data.tenggat14Hari.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Tidak ada tenggat batas waktu dalam 14 hari ke depan.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.tenggat14Hari.map((t) => {
                  const badgeColor =
                    t.daysLeft <= 3
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : t.daysLeft <= 7
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50/50"
                    >
                      <div className="space-y-0.5">
                        <Link
                          href={t.link}
                          className="text-sm font-medium text-navy-800 hover:underline"
                        >
                          {t.title}
                        </Link>
                        {t.extraInfo && (
                          <p className="text-xs text-gray-500">{t.extraInfo}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
                        >
                          {t.daysLeft === 0 ? 'Hari Ini' : `H-${t.daysLeft}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Kolom 3: Approval Menunggu Saya & Notifikasi Personal */}
        <div className="space-y-6">
          {/* Approval Menunggu Saya */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-navy-800">
                Approval Menunggu Saya
              </h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                {data.approvalMenungguSaya.count}
              </span>
            </div>

            {data.approvalMenungguSaya.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Semua surat telah ditinjau atau ditandatangani.
              </p>
            ) : (
              <div className="space-y-3">
                {data.approvalMenungguSaya.items.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-lg border border-amber-100 bg-amber-50/30 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {app.status}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {app.tglSurat || '-'}
                      </span>
                    </div>
                    <Link
                      href={`/surat-keluar/${app.id}`}
                      className="mt-1 block text-sm font-medium text-navy-800 hover:underline"
                    >
                      {app.subject}
                    </Link>
                    {app.noSurat && (
                      <span className="text-xs text-gray-500">
                        No: {app.noSurat}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifikasi Personal */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-800">
              Notifikasi Personal
            </h2>

            {data.notifikasiPersonal.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Tidak ada notifikasi baru saat ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.notifikasiPersonal.slice(0, 6).map((notif) => (
                  <div
                    key={notif.id}
                    className="rounded-lg border border-gray-100 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-navy-800">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {notif.date}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-600">{notif.description}</p>
                    <Link
                      href={notif.link}
                      className="mt-1 inline-block font-medium text-navy-700 hover:underline"
                    >
                      Buka →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aktivitas Terbaru */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy-800">
              Aktivitas Terbaru
            </h2>
            {data.aktivitasTerbaru.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Belum ada aktivitas tercatat.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.aktivitasTerbaru.slice(0, 5).map((act) => (
                  <div key={act.id} className="py-2 text-xs">
                    <div className="flex justify-between font-medium text-gray-700">
                      <span>{act.userName || 'Sistem'}</span>
                      <span className="text-[10px] text-gray-400">
                        {act.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-gray-500">
                      <span className="font-semibold text-navy-800">
                        {act.action}
                      </span>{' '}
                      pada {act.module}
                      {act.description ? ` (${act.description})` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

