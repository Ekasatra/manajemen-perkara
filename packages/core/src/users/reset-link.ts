import { eq } from 'drizzle-orm';
import { profiles } from '@ekasatra/db';
import { createSupabaseServiceClient } from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';
import { baseEmailLayout, escapeHtml } from '../notifications/templates';
import { sendEmailViaResend } from '../notifications/resend';
import { getSetting } from '../settings/read';

/** Hasil kirim link reset password. */
export interface ResetLinkResult {
  ok: boolean;
  /** Email tersamar (hanya 2 karakter pertama + ***). */
  maskedEmail?: string;
  error?: string;
}

/** Sembunyikan email: "an***@domain.com". */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

/**
 * Generate link reset password via Supabase `auth.admin.generateLink({type:'recovery'})`
 * dan kirim ke email terdaftar user. Link sekali pakai, kedaluwarsa ≤ 1 jam (aturan Supabase).
 * Tidak pernah mengembalikan link asli ke pemanggil (hanya email tersamar).
 */
export async function sendResetLink(
  db: DbExecutor,
  targetUserId: string,
  appUrl: string = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
): Promise<ResetLinkResult> {
  // 1. Cari user di profiles
  const [target] = await db
    .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName, isActive: profiles.isActive })
    .from(profiles)
    .where(eq(profiles.id, targetUserId))
    .limit(1);

  if (!target) return { ok: false, error: 'User tidak ditemukan' };
  if (!target.email) return { ok: false, error: 'User tidak memiliki email terdaftar' };
  if (!target.isActive) return { ok: false, error: 'Akun tidak aktif' };

  // 2. Generate link recovery via Supabase Admin
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: target.email,
    options: {
      redirectTo: `${appUrl}/set-password`,
    },
  });

  if (error || !data?.properties?.action_link) {
    return { ok: false, error: `Gagal membuat link: ${error?.message ?? 'tidak ada link'}` };
  }

  // 3. Kirim email via mailer (best-effort)
  const officeName = await getSetting<string>(db, 'office_name', 'EKASATRA Law & Policy Advisory');
  const resetUrl = data.properties.action_link;
  const subject = 'Reset Password — EKASATRA';
  const contentHtml = `
    <p>Yth. <strong>${escapeHtml(target.fullName)}</strong>,</p>
    <p>Anda (atau admin) meminta reset password untuk akun ini. Klik tombol di bawah untuk
    menetapkan password baru. Link berlaku <strong>1 jam</strong> dan hanya bisa dipakai sekali.</p>
    <p style="font-size: 13px; color: #64748B;">Jika Anda tidak meminta ini, abaikan email ini.</p>
  `;
  const html = baseEmailLayout({
    officeName: escapeHtml(officeName),
    title: subject,
    recipientName: escapeHtml(target.fullName),
    contentHtml,
    actionUrl: resetUrl,
    actionText: 'Tetapkan Password Baru',
  });

  const sendResult = await sendEmailViaResend({ to: target.email, subject, html });

  return {
    ok: sendResult.success,
    maskedEmail: maskEmail(target.email),
    error: sendResult.error,
  };
}