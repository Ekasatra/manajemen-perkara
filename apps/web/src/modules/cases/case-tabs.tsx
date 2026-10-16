'use client';

import { useState } from 'react';
import { formatDate, formatRupiah } from '@/lib/format';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { FormDialog } from '@/components/ui/form-dialog';

type CaseRow = {
  id: string;
  regNo: string;
  title: string;
  status: string;
  caseNumber: string | null;
  court: string | null;
  caseType: string | null;
  description: string | null;
  startDate: string | null;
  putusDate: string | null;
  upayaDeadline: string | null;
  closedDate: string | null;
};

type TimelineRow = {
  id: string;
  eventType: string;
  eventDate: string;
  title: string;
  description: string | null;
};

type ScheduleRow = {
  id: string;
  scheduleDate: string;
  scheduleTime: string | null;
  kind: string;
  location: string | null;
  status: string;
  notes: string | null;
};

type DocumentRow = {
  id: string;
  title: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  sharedWithClient: boolean;
  createdAt: Date;
};

type MemberRow = {
  userId: string;
  peran: string;
  fullName: string;
  createdAt: string;
};

type SuratMasukItem = {
  id: string;
  noAgenda: string;
  noSurat?: string | null;
  sender: string;
  subject: string;
  tglSurat?: string | null;
  tglTerima: string;
  sifat: string;
  status: string;
};

type SuratKeluarItem = {
  id: string;
  noSurat: string;
  subject: string;
  destination: string;
  jenis: string;
  tglSurat?: string | null;
  status: string;
};

type InvoiceItem = {
  id: string;
  invoiceNo: string;
  description?: string | null;
  amount: number;
  paidAmount: number;
  outstanding: number;
  status: string;
  invoiceDate: string;
  dueDate?: string | null;
};

type HonorariumItem = {
  id: string;
  userName: string;
  draftAmount: number;
  publishedAmount?: number | null;
  status: string;
};

type Props = {
  caseId: string;
  caseRow: CaseRow;
  clientName: string;
  opponentName: string | null;
  timeline: TimelineRow[];
  schedules: ScheduleRow[];
  documents: DocumentRow[];
  members: MemberRow[];
  suratMasuk: SuratMasukItem[];
  suratKeluar: SuratKeluarItem[];
  invoices: InvoiceItem[];
  honorarium: HonorariumItem[];
  canUpdate: boolean;
  canManageTeam: boolean;
  canViewBiaya: boolean;
};

const TABS = ['Ringkasan', 'Timeline', 'Jadwal', 'Dokumen', 'Surat', 'Biaya', 'Tim'] as const;
type Tab = (typeof TABS)[number];

export function CaseTabs(props: Props) {
  const [tab, setTab] = useState<Tab>('Ringkasan');

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-navy-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'border-b-2 border-navy-600 text-navy-700'
                : 'text-navy-400 hover:text-navy-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ringkasan' && <RingkasanTab {...props} />}
      {tab === 'Timeline' && <TimelineTab {...props} />}
      {tab === 'Jadwal' && <JadwalTab {...props} />}
      {tab === 'Dokumen' && <DokumenTab {...props} />}
      {tab === 'Surat' && <SuratTab {...props} />}
      {tab === 'Biaya' && <BiayaTab {...props} />}
      {tab === 'Tim' && <TimTab {...props} />}
    </div>
  );
}

function RingkasanTab({ caseRow, clientName, opponentName, canUpdate }: Props) {
  const statuses = ['Aktif', 'Putus', 'Banding', 'Kasasi', 'PK', 'Selesai'];
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Info label="No. Registrasi" value={caseRow.regNo} />
        <Info label="Status" value={caseRow.status} />
        <Info label="Klien" value={clientName} />
        <Info label="Pihak Lawan" value={opponentName ?? '-'} />
        <Info label="No. Perkara" value={caseRow.caseNumber ?? '-'} />
        <Info label="Pengadilan" value={caseRow.court ?? '-'} />
        <Info label="Jenis Perkara" value={caseRow.caseType ?? '-'} />
        <Info label="Tanggal Mulai" value={caseRow.startDate ? formatDate(caseRow.startDate) : '-'} />
        <Info label="Tanggal Putus" value={caseRow.putusDate ? formatDate(caseRow.putusDate) : '-'} />
        <Info label="Batas Upaya Hukum" value={caseRow.upayaDeadline ? formatDate(caseRow.upayaDeadline) : '-'} />
        <Info label="Tanggal Selesai" value={caseRow.closedDate ? formatDate(caseRow.closedDate) : '-'} />
      </dl>

      {caseRow.description ? (
        <div>
          <p className="mb-1 text-sm font-medium text-navy-800">Keterangan</p>
          <p className="text-sm text-navy-600">{caseRow.description}</p>
        </div>
      ) : null}

      {canUpdate ? (
        <div className="border-t border-navy-100 pt-4">
          <StatusChanger caseId={caseRow.id} currentStatus={caseRow.status} statuses={statuses} />
        </div>
      ) : null}

      <div className="border-t border-navy-100 pt-4">
        <a
          href={`/api/v1/cases/${caseRow.id}/export`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass.secondary}
        >
          Export Progres (PDF)
        </a>
      </div>
    </div>
  );
}

function StatusChanger({
  caseId,
  currentStatus,
  statuses,
}: {
  caseId: string;
  currentStatus: string;
  statuses: string[];
}) {
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;
    const res = await fetch(`/api/v1/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.error?.message ?? 'Gagal mengubah status');
      e.target.value = currentStatus;
    } else {
      window.location.reload();
    }
  }

  return (
    <div>
      <label htmlFor="status-select" className={labelClass}>
        Ubah Status
      </label>
      <select
        id="status-select"
        defaultValue={currentStatus}
        onChange={handleChange}
        className={inputClass}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-navy-400">
        Perubahan status otomatis memperbarui tanggal putus, batas upaya hukum, dan entri timeline.
      </p>
    </div>
  );
}

function TimelineTab({ caseId, timeline, canUpdate }: Props) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const title = String(formData.get('title') ?? '');
    const eventType = String(formData.get('eventType') ?? 'Catatan');
    const description = String(formData.get('description') ?? '');
    const eventDate = String(formData.get('eventDate') ?? '');

    const res = await fetch(`/api/v1/cases/${caseId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        eventType,
        description: description || undefined,
        eventDate: eventDate || undefined,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menambah entri');
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {canUpdate ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
            Tambah Entri
          </button>
        </div>
      ) : null}
      {timeline.length === 0 ? (
        <p className="text-sm text-navy-400">Belum ada entri timeline.</p>
      ) : (
        <ol className="space-y-3">
          {timeline.map((t) => (
            <li key={t.id} className="rounded-card border border-navy-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-navy-700">{t.title}</span>
                <span className="text-xs text-navy-400">{formatDate(t.eventDate)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-navy-50 px-2 py-0.5 text-xs text-navy-600">{t.eventType}</span>
              </div>
              {t.description ? <p className="mt-2 text-sm text-navy-600">{t.description}</p> : null}
            </li>
          ))}
        </ol>
      )}
      {canUpdate ? (
        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Tambah Entri Timeline"
          submitLabel="Tambah"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="tl-title" className={labelClass}>Judul</label>
            <input id="tl-title" name="title" type="text" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="tl-type" className={labelClass}>Tipe</label>
            <select id="tl-type" name="eventType" className={inputClass} defaultValue="Catatan">
              <option value="Catatan">Catatan</option>
              <option value="Putusan">Putusan</option>
              <option value="Banding">Banding</option>
              <option value="Kasasi">Kasasi</option>
              <option value="PK">PK</option>
              <option value="Dokumen">Dokumen</option>
              <option value="Surat">Surat</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label htmlFor="tl-date" className={labelClass}>Tanggal</label>
            <input id="tl-date" name="eventDate" type="date" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tl-desc" className={labelClass}>Keterangan</label>
            <textarea id="tl-desc" name="description" rows={2} className={inputClass} />
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}

function JadwalTab({ caseId, schedules, canUpdate }: Props) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const scheduleDate = String(formData.get('scheduleDate') ?? '');
    const scheduleTime = String(formData.get('scheduleTime') ?? '');
    const kind = String(formData.get('kind') ?? 'Sidang');
    const location = String(formData.get('location') ?? '');
    const notes = String(formData.get('notes') ?? '');

    const res = await fetch(`/api/v1/cases/${caseId}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleDate,
        scheduleTime: scheduleTime || undefined,
        kind: kind || undefined,
        location: location || undefined,
        notes: notes || undefined,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat jadwal');
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {canUpdate ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
            Tambah Jadwal
          </button>
        </div>
      ) : null}
      {schedules.length === 0 ? (
        <p className="text-sm text-navy-400">Belum ada jadwal.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-navy-600">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Jam</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 font-medium">Lokasi</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{formatDate(s.scheduleDate)}</td>
                  <td className="px-4 py-3">{s.scheduleTime ?? '-'}</td>
                  <td className="px-4 py-3">{s.kind}</td>
                  <td className="px-4 py-3">{s.location ?? '-'}</td>
                  <td className="px-4 py-3">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canUpdate ? (
        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Tambah Jadwal"
          submitLabel="Buat"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="sc-date" className={labelClass}>Tanggal</label>
            <input id="sc-date" name="scheduleDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="sc-time" className={labelClass}>Jam (HH:MM)</label>
            <input id="sc-time" name="scheduleTime" type="time" className={inputClass} />
          </div>
          <div>
            <label htmlFor="sc-kind" className={labelClass}>Jenis</label>
            <input id="sc-kind" name="kind" type="text" defaultValue="Sidang" className={inputClass} />
          </div>
          <div>
            <label htmlFor="sc-loc" className={labelClass}>Lokasi</label>
            <input id="sc-loc" name="location" type="text" className={inputClass} />
          </div>
          <div>
            <label htmlFor="sc-notes" className={labelClass}>Catatan</label>
            <textarea id="sc-notes" name="notes" rows={2} className={inputClass} />
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}

function DokumenTab({ caseId, documents, canUpdate }: Props) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const res = await fetch(`/api/v1/cases/${caseId}/documents`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal mengunggah dokumen');
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {canUpdate ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
            Unggah Dokumen
          </button>
        </div>
      ) : null}
      {documents.length === 0 ? (
        <p className="text-sm text-navy-400">Belum ada dokumen.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-navy-600">
              <tr>
                <th className="px-4 py-3 font-medium">Judul</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Dibagikan ke Klien</th>
                <th className="px-4 py-3 font-medium">Diunggah</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{d.title}</td>
                  <td className="px-4 py-3">{d.fileName ?? '-'}</td>
                  <td className="px-4 py-3">{d.sharedWithClient ? 'Ya' : 'Tidak'}</td>
                  <td className="px-4 py-3">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3">
                    <a href={`/api/v1/cases/${caseId}/documents/${d.id}/download`} className="text-navy-600 hover:underline">
                      Unduh
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canUpdate ? (
        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Unggah Dokumen"
          description="Maksimum 25 MB."
          submitLabel="Unggah"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="dc-title" className={labelClass}>Judul</label>
            <input id="dc-title" name="title" type="text" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="dc-file" className={labelClass}>File</label>
            <input id="dc-file" name="file" type="file" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              <input type="checkbox" name="sharedWithClient" value="true" /> Bagikan ke klien (portal)
            </label>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}

function SuratTab({ suratMasuk, suratKeluar }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-700">Surat Masuk</h3>
        {suratMasuk.length === 0 ? (
          <p className="text-sm text-navy-400">Belum ada surat masuk untuk perkara ini.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">No. Agenda</th>
                  <th className="px-4 py-3 font-medium">Pengirim</th>
                  <th className="px-4 py-3 font-medium">Perihal</th>
                  <th className="px-4 py-3 font-medium">Tgl. Surat</th>
                  <th className="px-4 py-3 font-medium">Sifat</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {suratMasuk.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">{s.noAgenda}</td>
                    <td className="px-4 py-3">{s.sender}</td>
                    <td className="px-4 py-3">{s.subject}</td>
                    <td className="px-4 py-3">{s.tglSurat ? formatDate(s.tglSurat) : '-'}</td>
                    <td className="px-4 py-3">{s.sifat}</td>
                    <td className="px-4 py-3">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-700">Surat Keluar</h3>
        {suratKeluar.length === 0 ? (
          <p className="text-sm text-navy-400">Belum ada surat keluar untuk perkara ini.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">No. Surat</th>
                  <th className="px-4 py-3 font-medium">Tujuan</th>
                  <th className="px-4 py-3 font-medium">Perihal</th>
                  <th className="px-4 py-3 font-medium">Jenis</th>
                  <th className="px-4 py-3 font-medium">Tgl. Surat</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {suratKeluar.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">{s.noSurat}</td>
                    <td className="px-4 py-3">{s.destination}</td>
                    <td className="px-4 py-3">{s.subject}</td>
                    <td className="px-4 py-3">{s.jenis}</td>
                    <td className="px-4 py-3">{s.tglSurat ? formatDate(s.tglSurat) : '-'}</td>
                    <td className="px-4 py-3">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BiayaTab({ invoices, honorarium, canViewBiaya }: Props) {
  if (!canViewBiaya) {
    return <p className="text-sm text-navy-400">Tab biaya hanya untuk Admin.</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-700">Invoice</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-navy-400">Belum ada invoice untuk perkara ini.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">No. Invoice</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Dibayar</th>
                  <th className="px-4 py-3 font-medium">Sisa</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3">{inv.invoiceNo}</td>
                    <td className="px-4 py-3">{inv.description ?? '-'}</td>
                    <td className="px-4 py-3">{formatRupiah(inv.amount)}</td>
                    <td className="px-4 py-3">{formatRupiah(inv.paidAmount)}</td>
                    <td className="px-4 py-3">{formatRupiah(inv.outstanding)}</td>
                    <td className="px-4 py-3">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-navy-700">Honor Tim</h3>
        {honorarium.length === 0 ? (
          <p className="text-sm text-navy-400">Belum ada honor untuk perkara ini.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Anggota</th>
                  <th className="px-4 py-3 font-medium">Draft</th>
                  <th className="px-4 py-3 font-medium">Dipublikasi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {honorarium.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3">{h.userName}</td>
                    <td className="px-4 py-3">{formatRupiah(h.draftAmount)}</td>
                    <td className="px-4 py-3">{h.publishedAmount != null ? formatRupiah(h.publishedAmount) : '-'}</td>
                    <td className="px-4 py-3">{h.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TimTab({ members, canManageTeam }: Props) {
  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-sm text-navy-400">Belum ada anggota tim.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-navy-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {members.map((m) => (
                <tr key={`${m.userId}-${m.peran}`}>
                  <td className="px-4 py-3">{m.fullName}</td>
                  <td className="px-4 py-3">{m.peran}</td>
                  <td className="px-4 py-3">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!canManageTeam ? (
        <p className="text-xs text-navy-400">Hanya Admin yang dapat mengelola anggota tim perkara.</p>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-navy-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-navy-800">{value}</dd>
    </div>
  );
}
