/**
 * Jadwal Sidang & Agenda: kalender bulanan seluruh perkara yang boleh dilihat pengguna.
 * Bulan dipilih lewat `?bulan=YYYY-MM`; tanggal dan hari ini mengikuti WIB.
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { can, ensureCan, listCases, listSchedulesInRange, requireUser } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
import { todayWib } from '@/modules/dashboard/metrics';
import { ScheduleCalendar } from '@/modules/schedule/schedule-calendar';

export const dynamic = 'force-dynamic';

const PAD_DAYS = 7;
const CASE_OPTIONS = 200;

function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { bulan } = await searchParams;
  const today = todayWib();
  const match = /^(\d{4})-(\d{2})$/.exec(bulan ?? '');
  const ym = match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? match : /^(\d{4})-(\d{2})/.exec(today)!;
  const year = Number(ym[1]);
  const month = Number(ym[2]) - 1;

  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'schedules');

  const first = `${ym[1]}-${ym[2]}-01`;
  const last = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  const [items, caseList] = await Promise.all([
    listSchedulesInRange(db, user, addDays(first, -PAD_DAYS), addDays(last, PAD_DAYS)),
    listCases(db, user, { page: 1, pageSize: CASE_OPTIONS, offset: 0 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Jadwal Sidang"
        description="Kalender sidang, mediasi, dan agenda perkara."
      />
      <ScheduleCalendar
        year={year}
        month={month}
        today={today}
        items={items}
        cases={caseList.rows.map((c) => ({ id: c.id, label: `${c.regNo} · ${c.title}` }))}
        canCreate={can(user, 'C', 'schedules')}
        canUpdate={can(user, 'U', 'schedules')}
      />
    </div>
  );
}
