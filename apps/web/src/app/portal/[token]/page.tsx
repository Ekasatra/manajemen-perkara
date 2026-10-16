import type { ReactNode } from 'react';
import { Download, LockKeyhole } from 'lucide-react';
import { createDb } from '@ekasatra/db';
import { getPortalData } from '@ekasatra/core';
import { PORTAL_GENERIC_ERROR_MESSAGE } from '@ekasatra/shared';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { Brand, FIRM_NAME } from '@/components/ui/brand';
import { buttonClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import { CaseStatusBadge } from '@/modules/cases/case-status-badge';

export const dynamic = 'force-dynamic';

const INVOICE_TONE: Record<string, BadgeTone> = {
  Lunas: 'success',
  Sebagian: 'warning',
  'Belum Bayar': 'danger',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-bold text-navy-800">{title}</h2>
      <div className="card-surface px-5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-navy-400">{children}</p>;
}

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createDb();

  let portalData;
  try {
    portalData = await getPortalData(db, token);
  } catch {
    // Token salah atau dinonaktifkan: pesan generik yang sama agar token tidak dapat ditebak.
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-4 py-12 text-center">
        <div className="w-full max-w-md card-surface p-8">
          <LockKeyhole aria-hidden="true" size={28} className="mx-auto text-navy-300" />
          <h1 className="mt-4 text-xl font-semibold text-navy-800">Akses portal tidak tersedia</h1>
          <p className="mt-2 text-sm text-navy-400">{PORTAL_GENERIC_ERROR_MESSAGE}</p>
          <p className="mt-6 border-t border-navy-100 pt-4 text-xs text-navy-400">{FIRM_NAME}</p>
        </div>
      </div>
    );
  }

  const { client, cases, timeline, schedules, documents, suratMasuk, invoices } = portalData;

  return (
    <div className="min-h-screen pb-16">
      <header className="login-hero text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Brand light />
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-2 sm:px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-300">Dashboard Klien</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{client.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60 sm:text-sm">
            <LockKeyhole aria-hidden="true" size={14} />
            Kode klien {client.clientCode} · Informasi bersifat rahasia dan hanya-baca
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pt-8 sm:px-6">
        <Section title="Perkara Anda">
          {cases.length === 0 ? (
            <Empty>Belum ada perkara yang terdaftar.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {cases.map((c) => (
                <li key={c.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-navy-400">
                    <span className="tabular-nums">{c.regNo}</span>
                    <CaseStatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 font-medium text-navy-800">{c.title}</p>
                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-navy-600">
                    {c.court ? (
                      <div>
                        <dt className="inline text-navy-400">Pengadilan: </dt>
                        <dd className="inline">{c.court}</dd>
                      </div>
                    ) : null}
                    {c.caseNumber ? (
                      <div>
                        <dt className="inline text-navy-400">Nomor perkara: </dt>
                        <dd className="inline">{c.caseNumber}</dd>
                      </div>
                    ) : null}
                    {c.startDate ? (
                      <div>
                        <dt className="inline text-navy-400">Mulai: </dt>
                        <dd className="inline">{formatDate(c.startDate)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Jadwal sidang dan agenda">
          {schedules.length === 0 ? (
            <Empty>Tidak ada agenda persidangan yang terjadwal saat ini.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {schedules.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-navy-800">
                      {s.kind}, {s.caseTitle}
                    </p>
                    <p className="text-sm text-navy-400">
                      {s.location || 'Lokasi belum ditentukan'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <p className="text-sm font-medium tabular-nums text-navy-800">
                      {formatDate(s.scheduleDate)}
                      {s.scheduleTime ? `, ${s.scheduleTime} WIB` : ''}
                    </p>
                    <Badge tone="warning">{s.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Perkembangan perkara">
          {timeline.length === 0 ? (
            <Empty>Belum ada perkembangan yang dapat dibagikan untuk perkara Anda.</Empty>
          ) : (
            <ol className="divide-y divide-navy-100">
              {timeline.map((item) => (
                <li key={item.id} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <p className="text-sm tabular-nums text-navy-400">{formatDate(item.eventDate)}</p>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-navy-800">{item.title}</p>
                      <Badge tone="neutral">{item.eventType}</Badge>
                    </div>
                    <p className="text-sm text-navy-400">Perkara: {item.caseTitle}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm text-navy-600">{item.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Dokumen berkas perkara">
          {documents.length === 0 ? (
            <Empty>Belum ada dokumen yang dibagikan untuk Anda.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-800">{doc.title}</p>
                    <p className="text-sm text-navy-400">
                      {doc.caseTitle}
                      {doc.fileName ? `, ${doc.fileName}` : ''}
                    </p>
                  </div>
                  <a
                    href={`/api/v1/portal/${token}/documents/${doc.id}/download?redirect=true`}
                    className={`${buttonClass.secondary} shrink-0`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download aria-hidden="true" size={16} />
                    Unduh
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Surat terkait perkara">
          {suratMasuk.length === 0 ? (
            <Empty>Tidak ada surat masuk terkait perkara Anda.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {suratMasuk.map((sm) => (
                <li
                  key={sm.id}
                  className="flex flex-col justify-between gap-1 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-navy-800">{sm.subject}</p>
                    <p className="text-sm text-navy-400">
                      {sm.caseTitle}, pengirim {sm.sender} ({sm.noAgenda})
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-navy-400">
                    Diterima {formatDate(sm.tglTerima)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Tagihan dan pembayaran">
          {invoices.length === 0 ? (
            <Empty>Tidak ada riwayat tagihan untuk akun Anda.</Empty>
          ) : (
            <ul className="divide-y divide-navy-100">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium tabular-nums text-navy-800">
                        {inv.invoiceNo}
                      </span>
                      <Badge tone={INVOICE_TONE[inv.status] ?? 'neutral'}>{inv.status}</Badge>
                    </div>
                    {inv.description ? (
                      <p className="text-sm text-navy-400">{inv.description}</p>
                    ) : null}
                    <p className="text-sm tabular-nums text-navy-400">
                      Tanggal {formatDate(inv.invoiceDate)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-medium tabular-nums text-navy-800">
                      {formatRupiah(inv.amount)}
                    </p>
                    {inv.paidAmount > 0 && inv.paidAmount < inv.amount ? (
                      <p className="text-sm tabular-nums text-success-fg">
                        Terbayar {formatRupiah(inv.paidAmount)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </main>
    </div>
  );
}
