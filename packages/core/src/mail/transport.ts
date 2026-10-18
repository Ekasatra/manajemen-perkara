/**
 * Transport email SMTP cPanel (mail.ekasatra.com) (W4 · R2 · K1).
 * Pengirim: "EKASATRA <info@ekasatra.com>", host mail.ekasatra.com:465 (SSL).
 * Env: SMTP_USER, SMTP_PASS, MAIL_FROM. Tanpa env → no-op + warning (dev tidak error).
 * Dependensi baru yang diizinkan: nodemailer saja.
 */
import nodemailer from 'nodemailer';
import type { SendEmailPayload, SendEmailResult } from '../notifications/resend';

/** True bila env SMTP lengkap (SMTP_USER + SMTP_PASS). */
export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let warned = false;

/**
 * Kirim email via SMTP cPanel (mail.ekasatra.com). Return null bila env belum diset
 * (pemanggil bisa fallback ke transport lain). Best-effort: tidak melempar.
 */
export async function sendViaSmtp(
  payload: SendEmailPayload,
): Promise<SendEmailResult | null> {
  if (!isSmtpConfigured()) {
    if (!warned && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[mail] SMTP_USER/SMTP_PASS belum diset — email tidak terkirim. ' +
          'Isi di environment (lihat .env.example).',
      );
      warned = true;
    }
    return null;
  }

  const host = process.env.SMTP_HOST || 'mail.ekasatra.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const from = payload.from || process.env.MAIL_FROM || 'EKASATRA <info@ekasatra.com>';

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transport.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.content, 'base64'),
            })),
          }
        : {}),
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}