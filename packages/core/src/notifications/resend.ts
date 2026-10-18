import { sendViaSmtp } from '../mail/transport';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  /** Resend: `content` base64. */
  attachments?: { filename: string; content: string }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type EmailTransport = (payload: SendEmailPayload) => Promise<SendEmailResult>;

let customTransport: EmailTransport | null = null;

/**
 * Set custom email transport (berguna untuk testing / mocking).
 */
export function setEmailTransport(transport: EmailTransport | null): void {
  customTransport = transport;
}

export async function sendEmailViaResend(
  payload: SendEmailPayload,
  apiKey: string = process.env.RESEND_API_KEY || '',
): Promise<SendEmailResult> {
  if (customTransport) {
    return customTransport(payload);
  }

  // W4 R2: coba SMTP cPanel (mail.ekasatra.com) dulu (transport utama).
  const smtpResult = await sendViaSmtp(payload);
  if (smtpResult !== null) return smtpResult;

  // Fallback: Resend API (konfigurasi lama).
  if (!apiKey) {
    // Produksi tanpa key = konfigurasi salah; jangan pura-pura terkirim.
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'SMTP_USER/SMTP_PASS atau RESEND_API_KEY belum diset' };
    }
    // Mode simulasi/development tanpa API key — tidak throw agar flow tidak macet
    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  const from = payload.from || process.env.RESEND_FROM_EMAIL || 'EKASATRA <notifications@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      return {
        success: false,
        error: `Resend API error (${res.status}): ${JSON.stringify(errData)}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

