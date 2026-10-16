import type { DashboardScheduleItem, DashboardTenggatItem } from '@ekasatra/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

/** Tanggal "YYYY-MM-DD" hari ini di WIB. */
export function todayWib(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Selisih hari kalender antara dua tanggal ISO (to - from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export type ScheduleDay = { date: string; label: string; count: number };

/** Jumlah sidang per hari untuk 7 hari mulai `today`, termasuk hari kosong (nilai 0). */
export function scheduleLoad(items: DashboardScheduleItem[], today: string): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.parse(`${today}T00:00:00Z`) + i * DAY_MS).toISOString().slice(0, 10);
    return {
      date,
      label: WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? '',
      count: items.filter((s) => s.scheduleDate === date).length,
    };
  });
}

export type DeadlineBucket = { label: string; count: number; urgent: boolean };

/** Sebaran tenggat menurut kedekatan; batas hari mengikuti penanda di tampilan. */
export function deadlineBuckets(items: DashboardTenggatItem[]): DeadlineBucket[] {
  const within = (max: number, min = 0) =>
    items.filter((t) => t.daysLeft >= min && t.daysLeft <= max).length;
  return [
    { label: 'Hari ini', count: within(0), urgent: true },
    { label: '1 sampai 3 hari', count: within(3, 1), urgent: true },
    { label: '4 sampai 7 hari', count: within(7, 4), urgent: false },
    { label: '8 sampai 14 hari', count: within(14, 8), urgent: false },
  ];
}

/** Persen bulat; 0 bila penyebut 0. */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
