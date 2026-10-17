'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FactList } from '@/components/ui/fact-list';
import { FormDialog } from '@/components/ui/form-dialog';
import { FieldError, Label, RequiredNote } from '@/components/ui/field';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import type { Column } from '@/components/ui/responsive-table';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import { StatusBadge as InvoiceStatusBadge } from '@/modules/invoices/status-badge';
import {
  createCaseMemberSchema,
  createScheduleSchema,
  createTimelineSchema,
} from '@ekasatra/shared';
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
  staffOptions: { id: string; name: string; role: string }[];
};

const TABS = ['Profil', 'Timeline', 'Jadwal', 'Dokumen', 'Biaya', 'Tim', 'Surat'] as const;
type Tab = (typeof TABS)[number];

const tabId = (t: Tab) => `case-tab-${t}`;
const PANEL_ID = 'case-tab-panel';

const TAB_COUNT: Partial<Record<Tab, (p: Props) => number>> = {
  Timeline: (p) => p.timeline.length,
  Jadwal: (p) => p.schedules.length,
  Dokumen: (p) => p.documents.length,
  Biaya: (p) => p.invoices.length,
  Tim: (p) => p.members.length,
  Surat: (p) => p.suratMasuk.length + p.suratKeluar.length,
};

const dateOrDash = (v: string | null | undefined) => (v ? formatDate(v) : '-');

/** Kotak tabel/daftar bergaris, dipakai semua tab agar seragam. */
function Box({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden card-surface">{children}</div>;
}

function Muted({ children }: { children: string }) {
  return <p className="text-sm text-navy-400">{children}</p>;
}

/** Tombol aksi tab: lebar penuh di mobile, di kanan pada layar lebar. */
function TabAction({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <div className="flex sm:justify-end">
      <button type="button" onClick={onClick} className={`${buttonClass.primary} w-full sm:w-auto`}>
        {children}
      </button>
    </div>
  );
}

export function CaseTabs(props: Props) {
  const [tab, setTab] = useState<Tab>('Profil');

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bagian perkara"
        className="mb-4 flex w-full gap-[12px] overflow-x-auto rounded-control border border-navy-100 bg-surface/60 p-1 sm:w-fit"
      >
        {TABS.filter((t) => t !== 'Biaya' || props.canViewBiaya).map((t) => {
          const count = TAB_COUNT[t]?.(props);
          return (
            <button
              key={t}
              id={tabId(t)}
              type="button"
              role="tab"
              aria-selected={tab === t}
              aria-controls={PANEL_ID}
              onClick={() => setTab(t)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition md:min-h-9 ${
                tab === t
                  ? 'bg-surface text-navy-800 shadow-soft'
                  : 'text-navy-500 hover:bg-surface/70 hover:text-navy-800'
              }`}
            >
              {t}
              {count ? (
                <span className="rounded-full bg-navy-100 px-1.5 text-[11px] font-semibold text-navy-600">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(tab)}>
        {tab === 'Profil' && <RingkasanTab {...props} />}
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

function RingkasanTab({ caseRow }: Props) {
  return (
    <FactList
      rows={[
        ['Tanggal putus', dateOrDash(caseRow.putusDate)],
        ['Tanggal selesai', dateOrDash(caseRow.closedDate)],
        ['Keterangan', caseRow.description ?? '-'],
      ]}
    />
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
                  {t.description ? (
                    <p className="mt-1 text-sm text-navy-600">{t.description}</p>
                  ) : null}
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
          schema={createTimelineSchema}
          onSubmit={handleSubmit}
        >
          <RequiredNote />
          <div>
            <Label htmlFor="tl-title" required>
              Judul
            </Label>
            <input
              id="tl-title"
              name="title"
              type="text"
              required
              aria-describedby="err-title"
              className={inputClass}
            />
            <FieldError name="title" />
          </div>
          <div>
            <Label htmlFor="tl-type" optional>
              Tipe
            </Label>
            <select
              id="tl-type"
              name="eventType"
              aria-describedby="err-eventType"
              className={inputClass}
              defaultValue="Catatan"
            >
              <option value="Catatan">Catatan</option>
              <option value="Putusan">Putusan</option>
              <option value="Banding">Banding</option>
              <option value="Kasasi">Kasasi</option>
              <option value="PK">PK</option>
              <option value="Dokumen">Dokumen</option>
              <option value="Surat">Surat</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            <FieldError name="eventType" />
          </div>
          <div>
            <Label htmlFor="tl-date" optional>
              Tanggal
            </Label>
            <input
              id="tl-date"
              name="eventDate"
              type="date"
              aria-describedby="err-eventDate"
              className={inputClass}
            />
            <FieldError name="eventDate" />
          </div>
          <div>
            <Label htmlFor="tl-desc" optional>
              Keterangan
            </Label>
            <textarea
              id="tl-desc"
              name="description"
              rows={2}
              aria-describedby="err-description"
              className={inputClass}
            />
            <FieldError name="description" />
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}

const SCHEDULE_TONE: Record<string, 'info' | 'success' | 'warning'> = {
  Terjadwal: 'info',
  Selesai: 'success',
  Ditunda: 'warning',
};

function JadwalTab({ caseId, schedules, canUpdate }: Props) {
  const [open, setOpen] = useState(false);

  async function markDone(id: string) {
    const res = await fetch(`/api/v1/cases/${caseId}/schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Selesai' }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal memperbarui jadwal');
    window.location.reload();
  }

  const columns: Column<ScheduleRow>[] = [
    { key: 'date', header: 'Tanggal', cell: (s) => formatDate(s.scheduleDate) },
    { key: 'time', header: 'Jam', cell: (s) => s.scheduleTime?.slice(0, 5) ?? '-' },
    { key: 'kind', header: 'Jenis', cell: (s) => s.kind },
    { key: 'location', header: 'Lokasi', cell: (s) => s.location ?? '-' },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => <Badge tone={SCHEDULE_TONE[s.status] ?? 'neutral'}>{s.status}</Badge>,
    },
    {
      key: 'action',
      header: 'Aksi',
      cell: (s) =>
        canUpdate && s.status === 'Terjadwal' ? (
          <button
            type="button"
            onClick={() => markDone(s.id).catch((e) => alert(e.message))}
            className="font-medium text-navy-700 underline"
          >
            Tandai selesai
          </button>
        ) : (
          '-'
        ),
    },
  ];

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
            columns={columns}
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
          schema={createScheduleSchema}
          onSubmit={handleSubmit}
        >
          <RequiredNote />
          <div>
            <Label htmlFor="sc-date" required>
              Tanggal
            </Label>
            <input
              id="sc-date"
              name="scheduleDate"
              type="date"
              required
              aria-describedby="err-scheduleDate"
              className={inputClass}
            />
            <FieldError name="scheduleDate" />
          </div>
          <div>
            <Label htmlFor="sc-time" optional>
              Jam
            </Label>
            <input
              id="sc-time"
              name="scheduleTime"
              type="time"
              aria-describedby="err-scheduleTime"
              className={inputClass}
            />
            <FieldError name="scheduleTime" />
          </div>
          <div>
            <Label htmlFor="sc-kind" optional>
              Jenis
            </Label>
            <input
              id="sc-kind"
              name="kind"
              type="text"
              aria-describedby="err-kind"
              defaultValue="Sidang"
              className={inputClass}
            />
            <FieldError name="kind" />
          </div>
          <div>
            <Label htmlFor="sc-loc" optional>
              Lokasi
            </Label>
            <input
              id="sc-loc"
              name="location"
              type="text"
              aria-describedby="err-location"
              className={inputClass}
            />
            <FieldError name="location" />
          </div>
          <div>
            <Label htmlFor="sc-notes" optional>
              Catatan
            </Label>
            <textarea
              id="sc-notes"
              name="notes"
              rows={2}
              aria-describedby="err-notes"
              className={inputClass}
            />
            <FieldError name="notes" />
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
            <label htmlFor="dc-title" className={labelClass}>
              Judul
            </label>
            <input id="dc-title" name="title" type="text" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="dc-file" className={labelClass}>
              File (PDF, Word, Excel, JPG, PNG; maks 25 MB)
            </label>
            <input
              id="dc-file"
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              className={inputClass}
            />
          </div>
          <div>
            <label className="flex min-h-11 items-center gap-2 text-sm text-navy-800">
              <input type="checkbox" name="sharedWithClient" value="true" className="size-4" />
              Bagikan ke klien (portal)
              <span className="ml-1.5 text-[11px] font-normal text-navy-400">(opsional)</span>
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
    <div className="space-y-5">
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
    <div className="space-y-5">
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

function TimTab({ caseId, members, canManageTeam, staffOptions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function add(fd: FormData) {
    const res = await fetch(`/api/v1/cases/${caseId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: String(fd.get('userId')), peran: String(fd.get('peran')) }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menambah anggota');
    setOpen(false);
    router.refresh();
  }

  async function remove(m: MemberRow) {
    const res = await fetch(
      `/api/v1/cases/${caseId}/members/${m.userId}?peran=${encodeURIComponent(m.peran)}`,
      { method: 'DELETE' },
    );
    const data = await res.json();
    if (!data.ok) {
      alert(data.error?.message ?? 'Gagal menghapus anggota');
      return;
    }
    router.refresh();
  }

  const columns: Column<MemberRow>[] = [
    {
      key: 'name',
      header: 'Anggota Tim',
      cell: (m) => (
        <span className="flex items-center gap-2">
          <Avatar name={m.fullName} /> {m.fullName}
        </span>
      ),
    },
    { key: 'role', header: 'Peran', cell: (m) => <Badge tone="neutral">{m.peran}</Badge> },
    { key: 'joined', header: 'Bergabung', cell: (m) => formatDate(m.createdAt) },
    ...(canManageTeam
      ? [
          {
            key: 'action',
            header: 'Aksi',
            cell: (m: MemberRow) => (
              <button
                type="button"
                onClick={() => remove(m)}
                className="font-medium text-danger-fg underline"
                aria-label={`Keluarkan ${m.fullName} dari tim`}
              >
                Keluarkan
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {canManageTeam ? <TabAction onClick={() => setOpen(true)}>Tambah anggota</TabAction> : null}
      {members.length === 0 ? (
        <Muted>Belum ada anggota tim.</Muted>
      ) : (
        <Box>
          <ResponsiveTable
            caption="Anggota tim perkara"
            columns={columns}
            rows={members}
            rowKey={(m) => `${m.userId}-${m.peran}`}
          />
        </Box>
      )}
      {!canManageTeam ? (
        <p className="text-xs text-navy-400">
          Hanya Admin yang dapat mengelola anggota tim perkara.
        </p>
      ) : (
        <FormDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Tambah anggota tim"
          description="Advokat dan Paralegal boleh lebih dari satu; Manajer Kasus hanya satu orang."
          submitLabel="Tambah"
          schema={createCaseMemberSchema}
          onSubmit={add}
        >
          <div>
            <Label htmlFor="tm-user" required>
              Anggota
            </Label>
            <select
              id="tm-user"
              name="userId"
              required
              aria-describedby="err-userId"
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Pilih anggota
              </option>
              {staffOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <FieldError name="userId" />
          </div>
          <div>
            <Label htmlFor="tm-peran" required>
              Peran
            </Label>
            <select
              id="tm-peran"
              name="peran"
              required
              aria-describedby="err-peran"
              defaultValue="Advokat"
              className={inputClass}
            >
              <option value="Advokat">Advokat</option>
              <option value="Paralegal">Paralegal</option>
              <option value="Manager">Manajer Kasus</option>
            </select>
            <FieldError name="peran" />
          </div>
        </FormDialog>
      )}
    </div>
  );
}
