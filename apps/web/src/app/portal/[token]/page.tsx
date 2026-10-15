import React from 'react';
import { createDb } from '@ekasatra/db';
import { getPortalData } from '@ekasatra/core';
import { PORTAL_GENERIC_ERROR_MESSAGE } from '@ekasatra/shared';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = createDb();

  let portalData;
  try {
    portalData = await getPortalData(db, token);
  } catch {
    // Tangani galat token salah atau dinonaktifkan dengan pesan generik yang sama
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 text-center">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
            🔒
          </div>
          <h1 className="mt-4 text-lg font-bold text-navy-800">
            Akses Portal Tidak Tersedia
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {PORTAL_GENERIC_ERROR_MESSAGE}
          </p>
          <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">
            EKASATRA Law & Policy Advisory
          </div>
        </div>
      </div>
    );
  }

  const { client, cases, timeline, schedules, documents, suratMasuk, invoices } = portalData;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-gray-50/70 pb-16">
      {/* 1. Header Bar Portal */}
      <header className="border-b border-gray-200 bg-navy-800 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[#B38B4D] uppercase">
              Portal Klien
            </div>
            <h1 className="text-xl font-bold">EKASATRA Law & Policy Advisory</h1>
          </div>
          <div className="text-right text-xs">
            <span className="text-gray-300">Selamat datang,</span>
            <div className="font-semibold text-white">{client.name}</div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="mx-auto max-w-6xl space-y-8 px-4 pt-8 sm:px-6">
        {/* Banner Klien */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="text-xs font-medium text-gray-400">Kode Klien: {client.clientCode}</span>
              <h2 className="text-2xl font-bold text-navy-800">{client.name}</h2>
              {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
            </div>
            <div className="flex gap-4 border-t pt-4 sm:border-t-0 sm:pt-0">
              <div className="rounded-xl bg-navy-50 px-4 py-2 text-center">
                <span className="block text-2xl font-extrabold text-navy-800">{cases.length}</span>
                <span className="text-xs text-navy-600">Perkara</span>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-2 text-center">
                <span className="block text-2xl font-extrabold text-amber-800">{schedules.length}</span>
                <span className="text-xs text-amber-600">Agenda</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Daftar Perkara */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-navy-800">Daftar Perkara Anda</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cases.length === 0 ? (
              <p className="col-span-2 rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                Belum ada data perkara yang terdaftar.
              </p>
            ) : (
              cases.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">{c.regNo}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {c.status}
                    </span>
                  </div>
                  <h4 className="mt-2 text-base font-bold text-navy-800">{c.title}</h4>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    {c.court && <p>Pengadilan: <span className="text-gray-700 font-medium">{c.court}</span></p>}
                    {c.caseNumber && <p>No. Perkara: <span className="text-gray-700 font-medium">{c.caseNumber}</span></p>}
                    {c.startDate && <p>Mulai: <span className="text-gray-700 font-medium">{c.startDate}</span></p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 4. Timeline Perjalanan Perkara (Tanpa Catatan / Dokumen / Surat) */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-navy-800">Perjalanan & Perkembangan Perkara</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {timeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Belum ada perkembangan publik untuk perkara Anda.
              </p>
            ) : (
              <div className="relative border-l-2 border-navy-100 ml-3 space-y-6">
                {timeline.map((item) => (
                  <div key={item.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-navy-700" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400">{item.eventDate}</span>
                      <span className="rounded bg-navy-50 px-2 py-0.5 text-[10px] font-semibold text-navy-700">
                        {item.eventType}
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-navy-800">{item.title}</div>
                    <div className="text-xs text-gray-500 font-medium">Perkara: {item.caseTitle}</div>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. Jadwal Sidang & Agenda */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-navy-800">Jadwal Sidang & Agenda</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {schedules.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Tidak ada agenda persidangan yang terjadwal saat ini.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {schedules.map((s) => (
                  <div key={s.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="font-bold text-navy-800">{s.kind} — {s.caseTitle}</div>
                      <div className="text-xs text-gray-500">{s.location || 'Lokasi belum ditentukan'}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-semibold text-amber-800">
                        {s.scheduleDate} {s.scheduleTime ? `• ${s.scheduleTime} WIB` : ''}
                      </div>
                      <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 6. Dokumen Perkara yang Dibagikan (Secure Download) */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-navy-800">Dokumen Berkas Perkara</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {documents.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Belum ada dokumen yang dibagikan untuk Anda.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold text-navy-800">{doc.title}</div>
                      <div className="text-xs text-gray-500">
                        {doc.caseTitle} {doc.fileName ? `• ${doc.fileName}` : ''}
                      </div>
                    </div>
                    <a
                      href={`/api/v1/portal/${token}/documents/${doc.id}/download?redirect=true`}
                      className="inline-flex items-center rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-xs hover:bg-navy-50"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Unduh Berkas ⬇
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 7. Surat Masuk Terkait Perkara (PRD §5.12) */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-navy-800">Surat Terkait Perkara</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {suratMasuk.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Tidak ada surat masuk terkait perkara Anda.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {suratMasuk.map((sm) => (
                  <div key={sm.id} className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="font-semibold text-navy-800">{sm.subject}</div>
                      <div className="text-xs text-gray-500">
                        {sm.caseTitle} • Pengirim: {sm.sender} ({sm.noAgenda})
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">Diterima: {sm.tglTerima}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 8. Tagihan & Pembayaran */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-navy-800">Tagihan & Rekap Pembayaran</h3>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {invoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Tidak ada riwayat tagihan untuk akun Anda.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const statusBg =
                    inv.status === 'Lunas'
                      ? 'bg-emerald-50 text-emerald-700'
                      : inv.status === 'Sebagian'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700';

                  return (
                    <div key={inv.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-navy-800">{inv.invoiceNo}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBg}`}>
                            {inv.status}
                          </span>
                        </div>
                        {inv.description && <p className="text-xs text-gray-500">{inv.description}</p>}
                        <span className="text-[11px] text-gray-400">Tgl: {inv.invoiceDate}</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="font-bold text-navy-800">{formatRupiah(inv.amount)}</div>
                        {inv.paidAmount > 0 && inv.paidAmount < inv.amount && (
                          <div className="text-xs text-emerald-600">Terbayar: {formatRupiah(inv.paidAmount)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
