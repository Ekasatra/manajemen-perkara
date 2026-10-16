import { CASE_STATUS } from '@ekasatra/shared/cases';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { daysBetween } from '@/modules/dashboard/metrics';

type FlowEvent = { eventType: string; eventDate: string };

/** Tahap alur = nilai status perkara; urutannya urutan upaya hukum. */
const STEP_LABEL: Record<string, string> = {
  Aktif: 'Terdaftar',
  Putus: 'Putusan',
  Banding: 'Banding',
  Kasasi: 'Kasasi',
  PK: 'Peninjauan kembali',
  Selesai: 'Selesai',
};

function stepDate(
  status: string,
  c: { startDate: string | null; putusDate: string | null; closedDate: string | null },
  events: FlowEvent[],
): string | null {
  if (status === 'Aktif') return c.startDate;
  if (status === 'Putus') return c.putusDate;
  if (status === 'Selesai') return c.closedDate;
  // Banding, Kasasi, PK: tanggal kejadian terakhir bertipe sama di timeline.
  return (
    events
      .filter((e) => e.eventType === status)
      .map((e) => e.eventDate)
      .sort()
      .at(-1) ?? null
  );
}

/**
 * Alur perkara dari status nyata. Tahap sebelum status sekarang dianggap terlewati dengan
 * selesai; perkara yang melompati tahap (mis. putus lalu selesai) tetap menampilkan semuanya.
 */
export function CaseFlow({
  status,
  startDate,
  putusDate,
  closedDate,
  upayaDeadline,
  events,
  today,
}: {
  status: string;
  startDate: string | null;
  putusDate: string | null;
  closedDate: string | null;
  upayaDeadline: string | null;
  events: FlowEvent[];
  today: string;
}) {
  const steps = CASE_STATUS as readonly string[];
  const current = Math.max(0, steps.indexOf(status));
  const daysLeft = upayaDeadline ? daysBetween(today, upayaDeadline) : null;

  return (
    <Card title="Alur perkara" className="mb-6">
      <ol className="grid gap-4 md:grid-cols-6">
        {steps.map((s, i) => {
          const state =
            i < current || status === 'Selesai' ? 'done' : i === current ? 'current' : 'pending';
          const date = stepDate(s, { startDate, putusDate, closedDate }, events);
          return (
            <li
              key={s}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`relative flex items-start gap-3 md:flex-col md:items-center md:gap-2 md:text-center ${
                i > 0
                  ? `md:before:absolute md:before:-left-1/2 md:before:right-1/2 md:before:top-3 md:before:h-0.5 ${
                      state === 'pending' ? 'md:before:bg-navy-200' : 'md:before:bg-navy-700'
                    }`
                  : ''
              }`}
            >
              <span
                aria-hidden="true"
                className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums ${
                  state === 'done'
                    ? 'border-navy-700 bg-navy-700 text-surface'
                    : state === 'current'
                      ? 'border-gold-500 bg-gold-500 text-white ring-4 ring-gold-500/20'
                      : 'border-navy-200 bg-surface text-navy-400'
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm ${state === 'pending' ? 'text-navy-400' : 'font-medium text-navy-800'}`}
                >
                  {STEP_LABEL[s] ?? s}
                </p>
                <p className="text-xs text-navy-400">
                  {state === 'current'
                    ? 'Tahap saat ini'
                    : state === 'done'
                      ? 'Terlewati'
                      : 'Belum'}
                  {date ? `, ${formatDate(date)}` : ''}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {upayaDeadline && daysLeft !== null ? (
        <p className="mt-4 border-t border-navy-100 pt-3 text-sm text-navy-400">
          Batas upaya hukum {formatDate(upayaDeadline)}:{' '}
          <span
            className={daysLeft <= 3 ? 'font-medium text-danger-fg' : 'font-medium text-navy-800'}
          >
            {daysLeft < 0
              ? `lewat ${-daysLeft} hari`
              : daysLeft === 0
                ? 'hari ini'
                : `${daysLeft} hari lagi`}
          </span>
        </p>
      ) : null}
    </Card>
  );
}
