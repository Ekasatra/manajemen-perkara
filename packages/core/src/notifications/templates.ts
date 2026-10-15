import type { NotificationEvent } from '@ekasatra/shared';

export interface EmailContent {
  subject: string;
  html: string;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function baseEmailLayout({
  officeName,
  title,
  recipientName,
  contentHtml,
  actionUrl,
  actionText,
}: {
  officeName: string;
  title: string;
  recipientName: string;
  contentHtml: string;
  actionUrl?: string;
  actionText?: string;
}): string {
  const buttonHtml =
    actionUrl && actionText
      ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${actionUrl}" style="background-color: #1A2E44; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          ${actionText}
        </a>
      </div>`
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px 16px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <!-- Header -->
    <div style="background-color: #1A2E44; padding: 24px 28px; border-bottom: 3px solid #B38B4D;">
      <h2 style="margin: 0; color: #FFFFFF; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">${officeName}</h2>
      <p style="margin: 4px 0 0 0; color: #B38B4D; font-size: 13px; font-weight: 500;">Sistem Manajemen Perkara</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 28px;">
      <p style="margin-top: 0; font-size: 15px; color: #334155;">Yth. <strong>${recipientName}</strong>,</p>
      <div style="margin: 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
        ${contentHtml}
      </div>
      ${buttonHtml}
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 12px; color: #64748B; margin: 0;">
        Ini adalah pesan otomatis dari sistem internal ${officeName}. Mohon tidak membalas email ini secara langsung.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

function renderTemplateRaw(
  event: NotificationEvent,
  recipientName: string,
  officeName: string = 'EKASATRA Law & Policy Advisory',
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ekasatra.id',
): EmailContent {
  switch (event.type) {
    case 'surat_submit': {
      const subject = `[Review Diperlukan] Surat Keluar: ${event.data.subject}`;
      const contentHtml = `
        <p>Surat keluar berikut telah diajukan oleh <strong>${event.data.submitterName}</strong> dan membutuhkan peninjauan (review) dari Anda:</p>
        <div style="background-color: #F1F5F9; border-left: 4px solid #1A2E44; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 6px 0;"><strong>Perihal:</strong> ${event.data.subject}</p>
          ${event.data.noSurat ? `<p style="margin: 0;"><strong>No. Surat:</strong> ${event.data.noSurat}</p>` : ''}
        </div>
        <p>Silakan tinjau dan berikan persetujuan atau catatan revisi pada sistem.</p>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/surat-keluar/${event.data.suratId}`,
          actionText: 'Tinjau Surat Keluar',
        }),
      };
    }

    case 'surat_sign': {
      const subject = `[Tanda Tangan Diperlukan] Surat Keluar: ${event.data.subject}`;
      const contentHtml = `
        <p>Surat keluar berikut telah disetujui reviewer dan siap untuk ditandatangani oleh Anda:</p>
        <div style="background-color: #F1F5F9; border-left: 4px solid #B38B4D; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 6px 0;"><strong>Perihal:</strong> ${event.data.subject}</p>
          ${event.data.noSurat ? `<p style="margin: 0 0 6px 0;"><strong>No. Surat:</strong> ${event.data.noSurat}</p>` : ''}
          ${event.data.reviewerName ? `<p style="margin: 0;"><strong>Disetujui oleh:</strong> ${event.data.reviewerName}</p>` : ''}
        </div>
        <p>Silakan masuk ke sistem untuk menandatangani surat ini.</p>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/surat-keluar/${event.data.suratId}`,
          actionText: 'Buka Surat untuk Tanda Tangan',
        }),
      };
    }

    case 'surat_approved': {
      const subject = `[Disetujui] Surat Keluar: ${event.data.subject}`;
      const contentHtml = `
        <p>Surat keluar yang Anda buat telah selesai ditandatangani dan siap untuk dikirimkan:</p>
        <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 6px 0;"><strong>Perihal:</strong> ${event.data.subject}</p>
          ${event.data.noSurat ? `<p style="margin: 0 0 6px 0;"><strong>No. Surat:</strong> ${event.data.noSurat}</p>` : ''}
          ${event.data.signerName ? `<p style="margin: 0;"><strong>Ditandatangani oleh:</strong> ${event.data.signerName}</p>` : ''}
        </div>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/surat-keluar/${event.data.suratId}`,
          actionText: 'Lihat Surat Keluar',
        }),
      };
    }

    case 'surat_reject': {
      const subject = `[Revisi/Ditolak] Surat Keluar: ${event.data.subject}`;
      const contentHtml = `
        <p>Surat keluar berikut membutuhkan revisi atau telah ditolak oleh <strong>${event.data.rejecterName}</strong>:</p>
        <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 6px 0;"><strong>Perihal:</strong> ${event.data.subject}</p>
          ${event.data.noSurat ? `<p style="margin: 0 0 6px 0;"><strong>No. Surat:</strong> ${event.data.noSurat}</p>` : ''}
          <p style="margin: 0; color: #991B1B;"><strong>Catatan Revisi:</strong> ${event.data.reason}</p>
        </div>
        <p>Silakan perbaiki surat sesuai dengan catatan yang diberikan.</p>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/surat-keluar/${event.data.suratId}`,
          actionText: 'Perbaiki Surat',
        }),
      };
    }

    case 'surat_disposisi': {
      const subject = `[Disposisi Surat Masuk] ${event.data.subject} (${event.data.noAgenda})`;
      const contentHtml = `
        <p>Anda menerima disposisi untuk surat masuk berikut:</p>
        <div style="background-color: #F1F5F9; border-left: 4px solid #1A2E44; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 6px 0;"><strong>No. Agenda:</strong> ${event.data.noAgenda}</p>
          <p style="margin: 0 0 6px 0;"><strong>Pengirim:</strong> ${event.data.sender}</p>
          <p style="margin: 0 0 6px 0;"><strong>Perihal:</strong> ${event.data.subject}</p>
          ${event.data.note ? `<p style="margin: 0; color: #1E293B;"><strong>Instruksi Disposisi:</strong> ${event.data.note}</p>` : ''}
        </div>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/surat-masuk/${event.data.suratMasukId}`,
          actionText: 'Buka Surat Masuk',
        }),
      };
    }

    case 'honor_publish': {
      const formattedAmount = formatRupiah(event.data.amount);
      const subject = `[Distribusi Honor Tim] Perkara: ${event.data.caseTitle}`;
      const contentHtml = `
        <p>Honorarium tim untuk perkara <strong>${event.data.caseTitle}</strong> telah didistribusikan oleh Admin:</p>
        <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #166534;">Jumlah Honor Anda:</p>
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #15803D;">${formattedAmount}</p>
        </div>
        <p>Detail pembayaran dapat dilihat pada menu Honorarium di sistem.</p>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/honor-tim`,
          actionText: 'Lihat Daftar Honor',
        }),
      };
    }

    case 'reminder_sidang': {
      const subject = `[Pengingat Sidang H-${event.data.daysLeft}] Perkara: ${event.data.caseTitle}`;
      const contentHtml = `
        <p>Pengingat jadwal sidang ${event.data.daysLeft === 0 ? 'hari ini' : `${event.data.daysLeft} hari ke depan`} untuk perkara yang Anda tangani:</p>
        <div style="background-color: #FFFBEB; border-left: 4px solid #D97706; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 6px 0;"><strong>Perkara:</strong> ${event.data.caseTitle}</p>
          <p style="margin: 0 0 6px 0;"><strong>Tanggal:</strong> ${event.data.scheduleDate}</p>
          ${event.data.scheduleTime ? `<p style="margin: 0 0 6px 0;"><strong>Waktu:</strong> ${event.data.scheduleTime} WIB</p>` : ''}
          ${event.data.location ? `<p style="margin: 0;"><strong>Lokasi / Pengadilan:</strong> ${event.data.location}</p>` : ''}
        </div>
        <p>Pastikan berkas dan persiapan sidang telah lengkap.</p>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/cases/${event.data.caseId}`,
          actionText: 'Buka Detail Perkara',
        }),
      };
    }

    case 'reminder_upaya': {
      const subject = `[Perhatian: Batas Upaya Hukum H-${event.data.daysLeft}] Perkara: ${event.data.caseTitle}`;
      const contentHtml = `
        <p>Pemberitahuan tenggat batas waktu upaya hukum (banding/kasasi/PK) tersisa <strong>${event.data.daysLeft} hari</strong>:</p>
        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0 0 6px 0;"><strong>Perkara:</strong> ${event.data.caseTitle}</p>
          <p style="margin: 0 0 6px 0; color: #991B1B;"><strong>Batas Waktu:</strong> ${event.data.deadlineDate}</p>
          <p style="margin: 0; font-size: 13px; color: #7F1D1D;">Segera koordinasikan dengan klien dan tim advokat terkait pengajuan upaya hukum.</p>
        </div>
      `;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: `${appUrl}/cases/${event.data.caseId}`,
          actionText: 'Tinjau Perkara',
        }),
      };
    }

    case 'custom': {
      const subject = event.data.subject;
      const contentHtml = `<p>${event.data.body.replace(/\n/g, '<br/>')}</p>`;
      return {
        subject,
        html: baseEmailLayout({
          officeName,
          title: subject,
          recipientName,
          contentHtml,
          actionUrl: event.data.actionUrl,
          actionText: event.data.actionText,
        }),
      };
    }
  }
}


export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render email. Semua teks dari user (perihal surat, judul perkara, alasan reject, nama) di-escape
 * pada HTML; subject email tetap teks polos.
 */
export function renderEmailTemplate(
  event: NotificationEvent,
  recipientName: string,
  officeName: string = 'EKASATRA Law & Policy Advisory',
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ekasatra.id',
): EmailContent {
  const safeData = Object.fromEntries(
    Object.entries(event.data as unknown as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === 'string' ? escapeHtml(v) : v,
    ]),
  );
  const safeEvent = { ...event, data: safeData } as unknown as NotificationEvent;
  const raw = renderTemplateRaw(event, recipientName, officeName, appUrl);
  const safe = renderTemplateRaw(safeEvent, escapeHtml(recipientName), escapeHtml(officeName), appUrl);
  return { subject: raw.subject, html: safe.html };
}
