'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';
import { FormDialog } from '@/components/ui/form-dialog';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { FieldError, Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { useToast } from '@/shell/toast';
import { createScheduleSchema } from '@ekasatra/shared';

export type CalendarItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseRegNo: string;
  scheduleDate: string;
  scheduleTime: string | null;
  kind: string;
  location: string | null;
  notes: string | null;
  status: string;
};
export type CaseOption = { id: string; label: string };

const SCHEDULE_TYPES = [
  'Sidang',
  'Mediasi',
  'Pembacaan',
  'Penunjukan',
  'Pemeriksaan Setempat',
  'Rapat Klien',
  'Lainnya',
] as const;
const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

// Chip kalender per status, sama dengan palet GAS: Terjadwal biru, Selesai hijau, Ditunda amber.
const CHIP: Record<string, string> = {
  Terjadwal: 'bg-sky-100 text-sky-800 dark:bg-navy-100 dark:text-navy-700',
  Selesai: 'bg-emerald-100 text-emerald-800 dark:bg-success-bg dark:text-success-fg',
  Ditunda: 'bg-amber-100 text-amber-800 dark:bg-warning-bg dark:text-warning-fg',
};
const STATUS_TONE: Record<string, BadgeTone> = {
  Terjadwal: 'info',
  Selesai: 'success',
  Ditunda: 'warning',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function isoDay(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/** Sel kalender mulai Senin, memuat minggu penuh di sekitar bulan. */
function buildGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month, 1 - offset);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start + i * 86400000);
    return {
      date: isoDay(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      inMonth: d.getUTCMonth() === month,
    };
  });
}

async function api(url: string, method: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menyimpan. Coba lagi.');
}

function timeText(t: string | null): string {
  return t ? t.slice(0, 5) : '';
}

export function ScheduleCalendar({
  year,
  month,
  today,
  items,
  cases,
  canCreate,
  canUpdate,
}: {
  year: number;
  /** 0 = Januari. */
  month: number;
  today: string;
  items: CalendarItem[];
  cases: CaseOption[];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<CalendarItem | null>(null);
  const [postpone, setPostpone] = useState<CalendarItem | null>(null);

  const grid = buildGrid(year, month);
  const byDate = new Map<string, CalendarItem[]>();
  for (const it of items) byDate.set(it.scheduleDate, [...(byDate.get(it.scheduleDate) ?? []), it]);
  const prev = month === 0 ? `${year - 1}-12` : `${year}-${pad(month)}`;
  const next = month === 11 ? `${year + 1}-01` : `${year}-${pad(month + 2)}`;
  const todayMonth = today.slice(0, 7);
  const inMonthItems = items.filter((i) => i.scheduleDate.startsWith(`${year}-${pad(month + 1)}`));

  async function add(fd: FormData) {
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    await api(`/api/v1/cases/${str('caseId')}/schedules`, 'POST', {
      scheduleDate: str('scheduleDate'),
      scheduleTime: str('scheduleTime') || undefined,
      kind: str('kind') || 'Sidang',
      location: str('location') || undefined,
      notes: str('notes') || undefined,
    });
    setAddOpen(false);
    toast.show('Jadwal ditambahkan.');
    router.refresh();
  }

  async function markDone() {
    if (!detail) return;
    await api(`/api/v1/cases/${detail.caseId}/schedules/${detail.id}`, 'PATCH', {
      status: 'Selesai',
    });
    setDetail(null);
    toast.show('Jadwal ditandai selesai.');
    router.refresh();
  }

  async function doPostpone(fd: FormData) {
    if (!postpone) return;
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    const reason = str('reason');
    const note = `Ditunda: ${reason}`;
    await api(`/api/v1/cases/${postpone.caseId}/schedules/${postpone.id}`, 'PATCH', {
      status: 'Ditunda',
      notes: postpone.notes ? `${postpone.notes}\n${note}` : note,
    });
    if (str('newDate')) {
      await api(`/api/v1/cases/${postpone.caseId}/schedules`, 'POST', {
        scheduleDate: str('newDate'),
        scheduleTime: str('newTime') || undefined,
        kind: postpone.kind,
        location: postpone.location || undefined,
        notes: `Pengganti jadwal ${postpone.scheduleDate}`,
      });
    }
    setPostpone(null);
    toast.show('Jadwal ditunda.');
    router.refresh();
  }

  return (
    <div>
      <div className="card-surface mb-4 flex flex-wrap items-center gap-[12px] p-3">
        <Link
          href={`/jadwal?bulan=${prev}`}
          aria-label="Bulan sebelumnya"
          className={`${buttonClass.secondary} px-3`}
        >
          <ChevronLeft aria-hidden="true" size={16} />
        </Link>
        <Link href={`/jadwal?bulan=${todayMonth}`} className={`${buttonClass.secondary}`}>
          Hari ini
        </Link>
        <Link
          href={`/jadwal?bulan=${next}`}
          aria-label="Bulan berikutnya"
          className={`${buttonClass.secondary} px-3`}
        >
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
        <h2 className="ml-2 font-display text-xl font-semibold text-navy-800">
          {MONTH_NAMES[month]} {year}
        </h2>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className={`${buttonClass.primary} ml-auto`}
          >
            <Plus aria-hidden="true" size={15} /> Tambah Jadwal
          </button>
        ) : null}
      </div>

      {/* Kalender bulanan: md ke atas. Di layar kecil diganti daftar agenda di bawah. */}
      <div className="card-surface hidden overflow-hidden md:block">
        <div className="grid grid-cols-7 border-b border-navy-100 bg-navy-50/50">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-navy-400"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell) => {
            const list = byDate.get(cell.date) ?? [];
            const isToday = cell.date === today;
            return (
              <div
                key={cell.date}
                className={`min-h-[108px] border-b border-r border-navy-50 p-1.5 ${cell.inMonth ? '' : 'bg-navy-50/40'}`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? 'bg-gold-500 font-bold text-white'
                      : cell.inMonth
                        ? 'text-navy-700'
                        : 'text-navy-300'
                  }`}
                >
                  {Number(cell.date.slice(8, 10))}
                </span>
                {list.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setDetail(it)}
                    title={`${it.caseTitle} · ${it.kind}`}
                    className={`mt-[12px] block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ${CHIP[it.status] ?? CHIP.Terjadwal}`}
                  >
                    {timeText(it.scheduleTime) ? `${timeText(it.scheduleTime)} ` : ''}
                    {it.kind} · {it.caseTitle}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <section aria-label="Agenda bulan ini" className={`${'card-surface'} mt-4 p-4 md:mt-4`}>
        <h2 className="mb-3 text-sm font-bold text-navy-800">
          Agenda {MONTH_NAMES[month]} {year}
        </h2>
        {inMonthItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-navy-400">Tidak ada jadwal pada bulan ini.</p>
        ) : (
          <ul className="divide-y divide-navy-50">
            {inMonthItems.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setDetail(it)}
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-gold-50/40"
                >
                  <div className="w-14 shrink-0 rounded-control bg-navy-700 py-1.5 text-center text-white dark:bg-gold-500 dark:text-navy-950">
                    <div className="text-[10px] uppercase tracking-wider">
                      {MONTH_NAMES[month]?.slice(0, 3)}
                    </div>
                    <div className="text-xl font-bold leading-none">
                      {Number(it.scheduleDate.slice(8, 10))}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-navy-800">
                      {it.caseTitle}
                    </div>
                    <div className="truncate text-xs text-navy-400">
                      {it.caseRegNo} · {it.kind}
                      {timeText(it.scheduleTime) ? ` · ${timeText(it.scheduleTime)} WIB` : ''}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[it.status] ?? 'neutral'}>{it.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canCreate ? (
        <FormDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title="Tambah Jadwal"
          submitLabel="Simpan"
          schema={createScheduleSchema}
          onSubmit={add}
        >
          <RequiredNote />
          <div>
            <label htmlFor="sj-case" className={labelClass}>
              Perkara
            </label>
            <select id="sj-case" name="caseId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Pilih perkara
              </option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="sj-kind" optional>
                Jenis
              </Label>
              <select
                id="sj-kind"
                name="kind"
                aria-describedby="err-kind"
                defaultValue="Sidang"
                className={inputClass}
              >
                {SCHEDULE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <FieldError name="kind" />
            </div>
            <div>
              <Label htmlFor="sj-date" required>
                Tanggal
              </Label>
              <input
                id="sj-date"
                name="scheduleDate"
                type="date"
                required
                aria-describedby="err-scheduleDate"
                className={inputClass}
              />
              <FieldError name="scheduleDate" />
            </div>
            <div>
              <Label htmlFor="sj-time" optional>
                Jam
              </Label>
              <input
                id="sj-time"
                name="scheduleTime"
                type="time"
                aria-describedby="err-scheduleTime"
                className={inputClass}
              />
              <FieldError name="scheduleTime" />
            </div>
            <div>
              <Label htmlFor="sj-loc" optional>
                Tempat
              </Label>
              <input
                id="sj-loc"
                name="location"
                aria-describedby="err-location"
                className={inputClass}
              />
              <FieldError name="location" />
            </div>
          </div>
          <div>
            <Label htmlFor="sj-notes" optional>
              Agenda / Catatan
            </Label>
            <textarea
              id="sj-notes"
              name="notes"
              rows={2}
              aria-describedby="err-notes"
              className={inputClass}
            />
            <FieldError name="notes" />
          </div>
        </FormDialog>
      ) : null}

      <FormDialog
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.kind}: ${detail.caseTitle}` : 'Detail jadwal'}
        description={detail ? detail.caseRegNo : undefined}
        submitLabel="Tandai Selesai"
        onSubmit={markDone}
      >
        {detail ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-navy-400">Tanggal</dt>
              <dd>
                {detail.scheduleDate}
                {timeText(detail.scheduleTime) ? `, ${timeText(detail.scheduleTime)} WIB` : ''}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy-400">Status</dt>
              <dd>
                <Badge tone={STATUS_TONE[detail.status] ?? 'neutral'}>{detail.status}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-navy-400">Tempat</dt>
              <dd className="flex items-center gap-1">
                <MapPin aria-hidden="true" size={13} />
                {detail.location || '-'}
              </dd>
            </div>
            {detail.notes ? (
              <p className="whitespace-pre-line rounded-control bg-navy-50 p-3 text-navy-700">
                {detail.notes}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-[12px] pt-1">
              <Link
                href={`/cases/${detail.caseId}`}
                className={`${buttonClass.secondary} px-3 text-xs`}
              >
                Buka perkara
              </Link>
              {canUpdate && detail.status === 'Terjadwal' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPostpone(detail);
                    setDetail(null);
                  }}
                  className={`${buttonClass.softDanger} px-3 text-xs`}
                >
                  Tunda
                </button>
              ) : null}
            </div>
          </dl>
        ) : null}
      </FormDialog>

      <FormDialog
        open={postpone !== null}
        onClose={() => setPostpone(null)}
        title="Tunda Jadwal"
        description={postpone ? `${postpone.kind}: ${postpone.caseTitle}` : undefined}
        submitLabel="Tunda"
        onSubmit={doPostpone}
      >
        <div>
          <label htmlFor="tj-reason" className={labelClass}>
            Alasan penundaan
          </label>
          <textarea id="tj-reason" name="reason" rows={2} required className={inputClass} />
        </div>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="tj-date" className={labelClass}>
              Jadwal pengganti (opsional)
            </label>
            <input id="tj-date" name="newDate" type="date" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tj-time" className={labelClass}>
              Jam pengganti
            </label>
            <input id="tj-time" name="newTime" type="time" className={inputClass} />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
