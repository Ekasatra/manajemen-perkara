import { describe, expect, it } from 'vitest';
import type { DashboardScheduleItem, DashboardTenggatItem } from '@ekasatra/shared';
import {
  daysBetween,
  deadlineBuckets,
  percent,
  scheduleLoad,
  todayWib,
} from '../src/modules/dashboard/metrics';

const sched = (scheduleDate: string): DashboardScheduleItem => ({
  id: scheduleDate,
  caseId: 'c',
  caseTitle: 't',
  scheduleDate,
  kind: 'Sidang',
  status: 'Terjadwal',
});
const due = (daysLeft: number): DashboardTenggatItem => ({
  id: String(daysLeft),
  type: 'sidang',
  title: 't',
  targetDate: '2026-01-01',
  daysLeft,
  link: '/',
});

describe('metrik dashboard', () => {
  it('hari WIB maju bila UTC sudah lewat 17:00', () => {
    expect(todayWib(new Date('2026-10-15T18:00:00Z'))).toBe('2026-10-16');
    expect(todayWib(new Date('2026-10-15T10:00:00Z'))).toBe('2026-10-15');
  });

  it('selisih hari kalender', () => {
    expect(daysBetween('2026-10-16', '2026-10-19')).toBe(3);
    expect(daysBetween('2026-10-16', '2026-10-16')).toBe(0);
  });

  it('beban sidang 7 hari, hari kosong bernilai 0', () => {
    const load = scheduleLoad(
      [sched('2026-10-16'), sched('2026-10-16'), sched('2026-10-18')],
      '2026-10-16',
    );
    expect(load).toHaveLength(7);
    expect(load.map((d) => d.count)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(load[0]?.label).toBe('Jum');
  });

  it('sebaran tenggat per kedekatan', () => {
    const b = deadlineBuckets([due(0), due(2), due(3), due(5), due(14)]);
    expect(b.map((x) => x.count)).toEqual([1, 2, 1, 1]);
  });

  it('persen aman untuk penyebut nol', () => {
    expect(percent(1, 0)).toBe(0);
    expect(percent(1, 3)).toBe(33);
  });
});
