/**
 * GET /api/cron/reminders — Vercel Cron harian 06:00 WIB (23:00 UTC) (PRD §5.13 & G5).
 * Vercel mengirim `Authorization: Bearer $CRON_SECRET`; hanya header itu yang diterima
 * (query string bocor ke log). Idempoten per hari di `runDailyRemindersCron`.
 */
import { createDb } from '@ekasatra/db';
import { runRoute, ok, runDailyRemindersCron } from '@ekasatra/core';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return runRoute(async () => {
    const auth = req.headers.get('authorization');
    const secret = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : undefined;
    const result = await runDailyRemindersCron(createDb(), secret);
    return ok(result);
  });
}
