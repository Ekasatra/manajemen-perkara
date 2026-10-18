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
  /** Pesan aman untuk ditampilkan ke admin. */
  error?: string;
  /** Detail mentah Supabase/SMTP — hanya untuk log server, jangan dikirim ke klien. */
  detail?: string;
}

/** Sembunyikan email: "an***@domain.com". */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

/**
 * Generate token recovery via Supabase `auth.admin.generateLink({type:'recovery'})` dan kirim
 * link `/set-password?token_hash=…` ke email terdaftar user. Token sekali pakai; masa berlaku
 * mengikuti setelan "Email OTP expiration" Supabase Auth (default 3600 dtk).
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
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return {
      ok: false,
      error: 'Gagal membuat link reset. Coba lagi nanti.',
      detail: error?.message ?? 'hashed_token kosong',
    };
  }

  // 3. Kirim email via mailer (best-effort)
  const officeName = await getSetting<string>(db, 'office_name', 'EKASATRA Law & Policy Advisory');
  // Bukan action_link: itu lewat /verify Supabase dan mengembalikan sesi di URL fragment.
  // token_hash diverifikasi /set-password via verifyOtp saat user menekan Simpan,
  // sehingga pemindai email yang membuka link tidak menghabiskan token sekali pakai.
  const resetUrl = `${appUrl}/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
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

  const maskedEmail = maskEmail(target.email);
  if (!sendResult.success) {
    return {
      ok: false,
      maskedEmail,
      error: 'Gagal mengirim email reset. Coba lagi nanti.',
      detail: sendResult.error,
    };
  }
  return { ok: true, maskedEmail };
}