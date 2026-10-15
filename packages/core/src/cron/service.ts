import { timingSafeEqual } from 'node:crypto';
import type { DbExecutor } from '../kernel/db-helpers';
import { unauthorized } from '@ekasatra/shared';
import { getSetting } from '../settings/read';
import { getHearingRemindersForDate, getUpayaDeadlineReminders } from '../cases/read';
import { isCronRemindersAlreadyRunToday, recordCronRemindersRun } from '../audit/read';
import { notify } from '../notifications/notify';

const SKIP_REASONS = new Set([
  'disabled_by_settings',
  'disabled_by_user_preference',
  'user_inactive',
  'recipient_not_found',
]);

export interface CronExecutionResult {
  status: 'success' | 'already_run_today';
  date: string;
  hearingRemindersSent: number;
  upayaRemindersSent: number;
  /** Notifikasi yang gagal terkirim (user nonaktif/preferensi mati tidak dihitung gagal). */
  failed: number;
  message?: string;
}

function secretMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Dapatkan tanggal hari ini dalam zona waktu WIB (UTC+7) format YYYY-MM-DD.
 */
export function getTodayWibDate(): string {
  const now = new Date();
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  return wibDate.toISOString().slice(0, 10);
}

/**
 * Layanan cron pengingat harian (PRD §5.13 & G5).
 * - Dijaga CRON_SECRET
 * - Idempoten per hari (maksimal sekali per hari WIB)
 * - Pengingat sidang H-reminder_days ke seluruh anggota tim perkara
 * - Pengingat batas upaya hukum H-5 ke advokat dan manager perkara
 */
export async function runDailyRemindersCron(
  db: DbExecutor,
  providedSecret?: string,
): Promise<CronExecutionResult> {
  // 1. Validasi CRON_SECRET
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !secretMatches(providedSecret, expectedSecret)) {
    throw unauthorized('CRON_SECRET tidak valid atau tidak disediakan');
  }

  // 2. Hitung tanggal hari ini di WIB
  const todayWibStr = getTodayWibDate();

  // 3. Jamin Idempotensi: Maksimal sekali per hari
  const alreadyRun = await isCronRemindersAlreadyRunToday(db, todayWibStr);
  if (alreadyRun) {
    return {
      status: 'already_run_today',
      date: todayWibStr,
      hearingRemindersSent: 0,
      upayaRemindersSent: 0,
      failed: 0,
      message: `Cron pengingat sudah dijalankan sebelumnya untuk tanggal ${todayWibStr}.`,
    };
  }

  // 4. Baca pengaturan reminder_days dari tabel settings (default 3 hari)
  const reminderDays = await getSetting<number>(db, 'reminder_days', 3);

  // Hitung tanggal target sidang = today + reminderDays
  const todayDate = new Date(`${todayWibStr}T00:00:00Z`);
  const hearingTargetDate = new Date(todayDate.getTime() + reminderDays * 24 * 60 * 60 * 1000);
  const hearingTargetDateStr = hearingTargetDate.toISOString().slice(0, 10);

  // Hitung tanggal target batas upaya hukum = today + 5 hari
  const upayaTargetMaxDate = new Date(todayDate.getTime() + 5 * 24 * 60 * 60 * 1000);
  const upayaTargetMaxDateStr = upayaTargetMaxDate.toISOString().slice(0, 10);

  let hearingRemindersSent = 0;
  let upayaRemindersSent = 0;
  let failed = 0;
  // Tolak berarti sengaja tidak dikirim (preferensi/nonaktif); hanya error transport yang gagal.
  const tally = (r: { sent: boolean; reason?: string }, onSent: () => void) => {
    if (r.sent) onSent();
    else if (r.reason && !SKIP_REASONS.has(r.reason)) failed++;
  };

  // 5. Eksekusi Pengingat Sidang
  const upcomingHearings = await getHearingRemindersForDate(db, hearingTargetDateStr);
  for (const hearing of upcomingHearings) {
    for (const userId of hearing.memberUserIds) {
      const res = await notify(db, {
        type: 'reminder_sidang',
        recipientUserId: userId,
        data: {
          caseId: hearing.caseId,
          caseTitle: hearing.caseTitle,
          scheduleDate: hearing.scheduleDate,
          scheduleTime: hearing.scheduleTime,
          location: hearing.location,
          daysLeft: reminderDays,
        },
      });
      tally(res, () => hearingRemindersSent++);
    }
  }

  // 6. Eksekusi Pengingat Batas Upaya Hukum
  const upcomingUpayaCases = await getUpayaDeadlineReminders(
    db,
    todayWibStr,
    upayaTargetMaxDateStr,
  );
  for (const item of upcomingUpayaCases) {
    const deadlineMs = new Date(`${item.deadlineDate}T00:00:00Z`).getTime();
    const daysLeft = Math.ceil((deadlineMs - todayDate.getTime()) / (24 * 60 * 60 * 1000));

    for (const userId of item.advocateAndManagerUserIds) {
      const res = await notify(db, {
        type: 'reminder_upaya',
        recipientUserId: userId,
        data: {
          caseId: item.caseId,
          caseTitle: item.caseTitle,
          deadlineDate: item.deadlineDate,
          daysLeft,
        },
      });
      tally(res, () => upayaRemindersSent++);
    }
  }

  // 7. Catat log eksekusi untuk menjamin idempotensi
  await recordCronRemindersRun(db, {
    todayWibStr,
    sidangCount: hearingRemindersSent,
    upayaCount: upayaRemindersSent,
  });

  return {
    status: 'success',
    date: todayWibStr,
    hearingRemindersSent,
    upayaRemindersSent,
    failed,
  };
}

