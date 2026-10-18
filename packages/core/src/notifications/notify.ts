import type { NotificationEvent, NotifyResult } from '@ekasatra/shared';
import type { DbExecutor } from '../kernel/db-helpers';
import { getSetting } from '../settings/read';
import { createSupabaseServiceClient } from '@ekasatra/db';
import { getMultipleUserNotificationProfiles, getUserNotificationProfile } from '../users/read';
import { baseEmailLayout, escapeHtml, renderEmailTemplate } from './templates';
import { sendEmailViaResend, type SendEmailPayload } from './resend';

/**
 * W4.2 · Background scheduler untuk pengiriman email.
 * Saat terdaftar (mis. Next.js `after()` dari `next/server` di Vercel),
 * pengiriman email dijadwalkan ke background agar tidak memblokir respons
 * atau transaksi DB. Kegagalan dicatat di log tetapi tidak melempar.
 *
 * Default: `null` → kirim sinkron (mode testing/development).
 */
type BackgroundScheduler = (task: () => Promise<void>) => void;

let backgroundScheduler: BackgroundScheduler | null = null;

/**
 * Daftarkan scheduler background (mis. `after` dari `next/server`).
 * Pass `null` untuk kembali ke mode sinkron (default; dipakai oleh tes).
 */
export function setBackgroundScheduler(scheduler: BackgroundScheduler | null): void {
  backgroundScheduler = scheduler;
}

/**
 * Kirim email via `sendEmailViaResend`. Bila scheduler background terdaftar,
 * jadwalkan ke background dan kembalikan hasil optimistik (`background_scheduled`).
 * Selalu best-effort: tidak pernah melempar.
 */
async function sendEmailBestEffort(
  payload: SendEmailPayload,
  recipientEmail: string,
): Promise<NotifyResult> {
  if (backgroundScheduler) {
    const to = recipientEmail;
    backgroundScheduler(async () => {
      try {
        await sendEmailViaResend(payload);
      } catch (err) {
        console.error(`[notify] background email to ${to} gagal:`, err);
      }
    });
    return { sent: true, reason: 'background_scheduled', recipientEmail };
  }

  const res = await sendEmailViaResend(payload);
  return {
    sent: res.success,
    reason: res.error,
    messageId: res.messageId,
    recipientEmail,
  };
}

/**
 * Kirim notifikasi email tunggal sesuai jenis event.
 * Menghormati pengaturan kantor `notif_email_enabled` dan preferensi email user di profil.
 */
export async function notify(
  db: DbExecutor,
  event: NotificationEvent,
): Promise<NotifyResult> {
  // 1. Cek pengaturan global kantor
  const notifEnabled = await getSetting<boolean>(db, 'notif_email_enabled', true);
  if (!notifEnabled) {
    return {
      sent: false,
      reason: 'disabled_by_settings',
    };
  }

  // 2. Baca profil penerima lewat fungsi baca modul users
  const profile = await getUserNotificationProfile(db, event.recipientUserId);
  if (!profile) {
    return {
      sent: false,
      reason: 'recipient_not_found',
    };
  }

  if (!profile.isActive) {
    return {
      sent: false,
      reason: 'user_inactive',
      recipientEmail: profile.email,
    };
  }

  // 3. Cek preferensi email pengguna
  switch (event.type) {
    case 'surat_submit':
    case 'surat_sign':
    case 'surat_approved':
    case 'surat_reject':
      if (!profile.emailApproval) {
        return {
          sent: false,
          reason: 'disabled_by_user_preference',
          recipientEmail: profile.email,
        };
      }
      break;

    case 'surat_disposisi':
      if (!profile.emailDisposisi) {
        return {
          sent: false,
          reason: 'disabled_by_user_preference',
          recipientEmail: profile.email,
        };
      }
      break;

    case 'reminder_sidang':
    case 'reminder_upaya':
      if (!profile.emailReminder) {
        return {
          sent: false,
          reason: 'disabled_by_user_preference',
          recipientEmail: profile.email,
        };
      }
      break;

    case 'honor_publish':
    case 'custom':
      // Mengikuti setting global kantor
      break;
  }

  // 4. Render template email dengan identitas kantor dari settings
  const officeName = await getSetting<string>(
    db,
    'office_name',
    'EKASATRA Law & Policy Advisory',
  );

  const { subject, html } = renderEmailTemplate(event, profile.fullName, officeName);

  // 5. Kirim via SMTP/Resend (W4.2: best-effort, background bila scheduler terdaftar)
  return sendEmailBestEffort(
    { to: profile.email, subject, html },
    profile.email,
  );
}

/**
 * Kirim batch notifikasi email (misal: reminder sidang ke seluruh anggota perkara).
 */
export async function notifyMany(
  db: DbExecutor,
  events: NotificationEvent[],
): Promise<NotifyResult[]> {
  const results: NotifyResult[] = [];
  for (const event of events) {
    const res = await notify(db, event);
    results.push(res);
  }
  return results;
}


/** Bentuk port `Notifier` modul surat (REQ-E1): email bebas teks, penerima user dan/atau eksternal. */
export interface GenericNotifyInput {
  /** Preferensi profil yang harus dihormati penerima `toUserIds`. */
  preference: 'email_approval' | 'email_disposisi';
  toUserIds: string[];
  /** Penerima eksternal (mis. surat keluar). Tidak terkena preferensi maupun `notif_email_enabled`. */
  toEmails?: string[];
  subject: string;
  body: string;
  attachments?: { bucket: string; path: string; fileName: string }[];
}

async function loadAttachment(a: { bucket: string; path: string }): Promise<string> {
  const { data, error } = await createSupabaseServiceClient().storage.from(a.bucket).download(a.path);
  if (error || !data) throw new Error(`Lampiran gagal diunduh: ${a.path}`);
  return Buffer.from(await data.arrayBuffer()).toString('base64');
}

/**
 * Kirim email bebas ke user (hormati setting kantor + preferensi) dan/atau alamat eksternal.
 * Hasil satu entri per penerima; lampiran diunduh sekali dari Storage.
 */
export async function notifyGeneric(
  db: DbExecutor,
  input: GenericNotifyInput,
  load: (a: { bucket: string; path: string }) => Promise<string> = loadAttachment,
): Promise<NotifyResult[]> {
  const officeName = await getSetting<string>(db, 'office_name', 'EKASATRA Law & Policy Advisory');
  const results: NotifyResult[] = [];
  const attachments = input.attachments?.length
    ? await Promise.all(
        input.attachments.map(async (a) => ({ filename: a.fileName, content: await load(a) })),
      )
    : undefined;

  const send = async (to: string, name: string): Promise<NotifyResult> => {
    const payload: SendEmailPayload = {
      to,
      subject: input.subject,
      html: baseEmailLayout({
        officeName: escapeHtml(officeName),
        title: escapeHtml(input.subject),
        recipientName: escapeHtml(name),
        contentHtml: `<p>${escapeHtml(input.body).replace(/\n/g, '<br>')}</p>`,
      }),
      attachments,
    };
    return sendEmailBestEffort(payload, to);
  };

  if (input.toUserIds.length) {
    if (!(await getSetting<boolean>(db, 'notif_email_enabled', true))) {
      results.push({ sent: false, reason: 'disabled_by_settings' });
    } else {
      const profiles = await getMultipleUserNotificationProfiles(db, input.toUserIds);
      for (const p of profiles) {
        const allowed = input.preference === 'email_approval' ? p.emailApproval : p.emailDisposisi;
        if (!p.isActive) results.push({ sent: false, reason: 'user_inactive', recipientEmail: p.email });
        else if (!allowed)
          results.push({ sent: false, reason: 'disabled_by_user_preference', recipientEmail: p.email });
        else results.push(await send(p.email, p.fullName));
      }
    }
  }
  for (const email of input.toEmails ?? []) results.push(await send(email, email));
  return results;
}
