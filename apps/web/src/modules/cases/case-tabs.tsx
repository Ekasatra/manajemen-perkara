'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { FactList } from '@/components/ui/fact-list';
import { FormDialog } from '@/components/ui/form-dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import type { Column } from '@/components/ui/responsive-table';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import { StatusBadge as InvoiceStatusBadge } from '@/modules/invoices/status-badge';
import type { InvoiceStatus } from '@ekasatra/shared/invoices';

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

const tabId = (t: Tab) => `case-tab-${t}`;
const PANEL_ID = 'case-tab-panel';

const dateOrDash = (v: string | null | undefined) => (v ? formatDate(v) : '-');

/** Kotak tabel/daftar bergaris, dipakai semua tab agar seragam. */
function Box({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-card border border-navy-200 bg-surface">{children}</div>;
}

function Muted({ children }: { children: string }) {
  return <p className="text-sm text-navy-400">{children}</p>;
}

/** Tombol aksi tab: lebar penuh di mobile, di kanan pada layar lebar. */
function TabAction({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <div className="flex sm:justify-end">
      <button
        type="button"
        onClick={onClick}
        className={`${buttonClass.primary} w-full sm:w-auto`}
      >
        {children}
      </button>
    </div>
  );
}

export function CaseTabs(props: Props) {
  const [tab, setTab] = useState<Tab>('Ringkasan');

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bagian perkara"
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-navy-200 px-4 md:mx-0 md:px-0"
      >
        {TABS.map((t) => (
          <button
            key={t}
            id={tabId(t)}
            type="button"
            role="tab"
            aria-selected={tab === t}
            aria-controls={PANEL_ID}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium transition-colors md:min-h-9 ${
              tab === t
                ? 'border-navy-700 text-navy-800'
                : 'border-transparent text-navy-400 hover:text-navy-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(tab)}>
        {tab === 'Ringkasan' && <RingkasanTab {...props} />}
        {tab === 'Timeline' && <TimelineTab {...props} />}
        {tab === 'Jadwal' && <JadwalTab {...props} />}
        {tab === 'Dokumen' && <DokumenTab {...props} />}
        {tab === 'Surat' && <SuratTab {...props} />}
        {tab === 'Biaya' && <BiayaTab {...props} />}
        {tab === 'Tim' && <TimTab {...props} />}
      </div>
    </div>
  );
}

function RingkasanTab({ caseRow, canUpdate }: Props) {
  const statuses = ['Aktif', 'Putus', 'Banding', 'Kasasi', 'PK', 'Selesai'];
  return (
    <div className="space-y-6">
      <FactList
        rows={[
          ['Tanggal putus', dateOrDash(caseRow.putusDate)],
          ['Tanggal selesai', dateOrDash(caseRow.closedDate)],
          ['Keterangan', caseRow.description ?? '-'],
        ]}
      />

      {canUpdate ? (
        <StatusChanger caseId={caseRow.id} currentStatus={caseRow.status} statuses={statuses} />
      ) : null}

      <a
        href={`/api/v1/cases/${caseRow.id}/export`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClass.secondary} w-full sm:w-auto`}
      >
        Ekspor progres (PDF)
      </a>
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
    <div className="max-w-sm">
      <label htmlFor="status-select" className={labelClass}>
        Ubah status
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
      {canUpdate ? <TabAction onClick={() => setOpen(true)}>Tambah entri</TabAction> : null}
      {timeline.length === 0 ? (
        <Muted>Belum ada entri timeline.</Muted>
      ) : (
        <Box>
          <ol className="divide-y divide-navy-100">
            {timeline.map((t) => (
              <li key={t.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <p className="text-sm tabular-nums text-navy-400">{formatDate(t.eventDate)}</p>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-navy-800">{t.title}</p>
                    <Badge tone="neutral">{t.eventType}</Badge>
                  </div>
                  {t.description ? <p className="mt-1 text-sm text-navy-600">{t.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Box>
      )}
      {canUpdate ? (
        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Tambah entri timeline"
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

const SCHEDULE_COLUMNS: Column<ScheduleRow>[] = [
  { key: 'date', header: 'Tanggal', cell: (s) => formatDate(s.scheduleDate) },
  { key: 'time', header: 'Jam', cell: (s) => s.scheduleTime ?? '-' },
  { key: 'kind', header: 'Jenis', cell: (s) => s.kind },
  { key: 'location', header: 'Lokasi', cell: (s) => s.location ?? '-' },
  { key: 'status', header: 'Status', cell: (s) => <Badge tone="warning">{s.status}</Badge> },
];

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
      {canUpdate ? <TabAction onClick={() => setOpen(true)}>Tambah jadwal</TabAction> : null}
      {schedules.length === 0 ? (
        <Muted>Belum ada jadwal.</Muted>
      ) : (
        <Box>
          <ResponsiveTable
            caption="Jadwal perkara"
            columns={SCHEDULE_COLUMNS}
            rows={schedules}
            rowKey={(s) => s.id}
          />
        </Box>
      )}
      {canUpdate ? (
        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Tambah jadwal"
          submitLabel="Buat"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="sc-date" className={labelClass}>Tanggal</label>
            <input id="sc-date" name="scheduleDate" type="date" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="sc-time" className={labelClass}>Jam</label>
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

  const columns: Column<DocumentRow>[] = [
    { key: 'title', header: 'Judul', cell: (d) => d.title },
    { key: 'file', header: 'File', cell: (d) => d.fileName ?? '-' },
    {
      key: 'shared',
      header: 'Dibagikan ke klien',
      cell: (d) => (d.sharedWithClient ? 'Ya' : 'Tidak'),
    },
    { key: 'created', header: 'Diunggah', cell: (d) => formatDate(d.createdAt) },
    {
      key: 'action',
      header: 'Aksi',
      cell: (d) => (
        <a
          href={`/api/v1/cases/${caseId}/documents/${d.id}/download`}
          className="font-medium text-navy-700 underline"
        >
          Unduh
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {canUpdate ? <TabAction onClick={() => setOpen(true)}>Unggah dokumen</TabAction> : null}
      {documents.length === 0 ? (
        <Muted>Belum ada dokumen.</Muted>
      ) : (
        <Box>
          <ResponsiveTable
            caption="Dokumen perkara"
            columns={columns}
            rows={documents}
            rowKey={(d) => d.id}
          />
        </Box>
      )}
      {canUpdate ? (
        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Unggah dokumen"
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
            <label className="flex min-h-11 items-center gap-2 text-sm text-navy-800">
              <input type="checkbox" name="sharedWithClient" value="true" className="size-4" />
              Bagikan ke klien (portal)
            </label>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}

const SURAT_MASUK_COLUMNS: Column<SuratMasukItem>[] = [
  { key: 'agenda', header: 'No. agenda', cell: (s) => s.noAgenda },
  { key: 'sender', header: 'Pengirim', cell: (s) => s.sender },
  { key: 'subject', header: 'Perihal', cell: (s) => s.subject },
  { key: 'date', header: 'Tanggal surat', cell: (s) => dateOrDash(s.tglSurat) },
  { key: 'sifat', header: 'Sifat', cell: (s) => s.sifat },
  { key: 'status', header: 'Status', cell: (s) => <Badge tone="info">{s.status}</Badge> },
];

const SURAT_KELUAR_COLUMNS: Column<SuratKeluarItem>[] = [
  { key: 'no', header: 'No. surat', cell: (s) => s.noSurat },
  { key: 'dest', header: 'Tujuan', cell: (s) => s.destination },
  { key: 'subject', header: 'Perihal', cell: (s) => s.subject },
  { key: 'jenis', header: 'Jenis', cell: (s) => s.jenis },
  { key: 'date', header: 'Tanggal surat', cell: (s) => dateOrDash(s.tglSurat) },
  { key: 'status', header: 'Status', cell: (s) => <Badge tone="info">{s.status}</Badge> },
];

function SuratTab({ suratMasuk, suratKeluar }: Props) {
  return (
    <div className="space-y-8">
      <section aria-label="Surat masuk">
        <h3 className="mb-3 text-base text-navy-800">Surat masuk</h3>
        {suratMasuk.length === 0 ? (
          <Muted>Belum ada surat masuk untuk perkara ini.</Muted>
        ) : (
          <Box>
            <ResponsiveTable
              caption="Surat masuk perkara"
              columns={SURAT_MASUK_COLUMNS}
              rows={suratMasuk}
              rowKey={(s) => s.id}
            />
          </Box>
        )}
      </section>
      <section aria-label="Surat keluar">
        <h3 className="mb-3 text-base text-navy-800">Surat keluar</h3>
        {suratKeluar.length === 0 ? (
          <Muted>Belum ada surat keluar untuk perkara ini.</Muted>
        ) : (
          <Box>
            <ResponsiveTable
              caption="Surat keluar perkara"
              columns={SURAT_KELUAR_COLUMNS}
              rows={suratKeluar}
              rowKey={(s) => s.id}
            />
          </Box>
        )}
      </section>
    </div>
  );
}

const INVOICE_COLUMNS: Column<InvoiceItem>[] = [
  { key: 'no', header: 'No. invoice', cell: (i) => i.invoiceNo },
  { key: 'desc', header: 'Keterangan', cell: (i) => i.description ?? '-' },
  { key: 'amount', header: 'Jumlah', align: 'right', cell: (i) => formatRupiah(i.amount) },
  { key: 'paid', header: 'Dibayar', align: 'right', cell: (i) => formatRupiah(i.paidAmount) },
  { key: 'rest', header: 'Sisa', align: 'right', cell: (i) => formatRupiah(i.outstanding) },
  {
    key: 'status',
    header: 'Status',
    cell: (i) => <InvoiceStatusBadge status={i.status as InvoiceStatus} />,
  },
];

const HONOR_COLUMNS: Column<HonorariumItem>[] = [
  { key: 'user', header: 'Anggota', cell: (h) => h.userName },
  { key: 'draft', header: 'Draft', align: 'right', cell: (h) => formatRupiah(h.draftAmount) },
  {
    key: 'published',
    header: 'Terdistribusi',
    align: 'right',
    cell: (h) => (h.publishedAmount != null ? formatRupiah(h.publishedAmount) : '-'),
  },
  { key: 'status', header: 'Status', cell: (h) => <Badge tone="neutral">{h.status}</Badge> },
];

function BiayaTab({ invoices, honorarium, canViewBiaya }: Props) {
  if (!canViewBiaya) {
    return <Muted>Tab biaya hanya untuk Admin.</Muted>;
  }
  return (
    <div className="space-y-8">
      <section aria-label="Invoice">
        <h3 className="mb-3 text-base text-navy-800">Invoice</h3>
        {invoices.length === 0 ? (
          <Muted>Belum ada invoice untuk perkara ini.</Muted>
        ) : (
          <Box>
            <ResponsiveTable
              caption="Invoice perkara"
              columns={INVOICE_COLUMNS}
              rows={invoices}
              rowKey={(i) => i.id}
            />
          </Box>
        )}
      </section>
      <section aria-label="Honor tim">
        <h3 className="mb-3 text-base text-navy-800">Honor tim</h3>
        {honorarium.length === 0 ? (
          <Muted>Belum ada honor untuk perkara ini.</Muted>
        ) : (
          <Box>
            <ResponsiveTable
              caption="Honor tim perkara"
              columns={HONOR_COLUMNS}
              rows={honorarium}
              rowKey={(h) => h.id}
            />
          </Box>
        )}
      </section>
    </div>
  );
}

const MEMBER_COLUMNS: Column<MemberRow>[] = [
  { key: 'name', header: 'Nama', cell: (m) => m.fullName },
  { key: 'role', header: 'Peran', cell: (m) => m.peran },
  { key: 'joined', header: 'Bergabung', cell: (m) => formatDate(m.createdAt) },
];

function TimTab({ members, canManageTeam }: Props) {
  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <Muted>Belum ada anggota tim.</Muted>
      ) : (
        <Box>
          <ResponsiveTable
            caption="Anggota tim perkara"
            columns={MEMBER_COLUMNS}
            rows={members}
            rowKey={(m) => `${m.userId}-${m.peran}`}
          />
        </Box>
      )}
      {!canManageTeam ? (
        <p className="text-xs text-navy-400">Hanya Admin yang dapat mengelola anggota tim perkara.</p>
      ) : null}
    </div>
  );
}
