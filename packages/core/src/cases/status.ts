/**
 * Logika transisi status perkara (Agent D · D3) — FUNGSI MURNI.
 * PRD §5.4:
 * - Saat status Putus: putus_date = tanggal status, upaya_deadline = + banding_deadline_days (default 14).
 * - Banding/Kasasi/PK/Selesai: upaya_deadline dikosongkan. Selesai: closed_date diisi.
 * - Setiap perubahan status otomatis menambah entri timeline.
 *
 * Dipisah dari DB agar tabel keputusan (status × kondisi) bisa diuji otomatis tanpa IO.
 */
import type { CaseStatus, TimelineEventType } from '@ekasatra/shared';
import { normalizeRole } from '../kernel/policy';

export interface CaseStatusState {
  status: CaseStatus;
  putusDate: string | null;
  upayaDeadline: string | null;
  closedDate: string | null;
}

export interface StatusChangeInput {
  /** Status perkara sekarang. */
  current: CaseStatusState;
  /** Status target (PRD: "urutan bebas, validasi nilai saja"). */
  newStatus: CaseStatus;
  /** Hari tenggat upaya hukum dari setting `banding_deadline_days` (default 14). */
  bandingDeadlineDays: number;
  /** Tanggal status = hari ini (ISO `YYYY-MM-DD`, WIB). */
  today: string;
}

export interface StatusChangeResult {
  /** Field perkara yang berubah — diterapkan ke UPDATE. */
  caseUpdate: {
    status: CaseStatus;
    putusDate: string | null;
    upayaDeadline: string | null;
    closedDate: string | null;
  };
  /** Enri timeline yang otomatis ditambahkan (PRD §5.4). */
  timelineEntry: {
    eventType: TimelineEventType;
    title: string;
    description: string;
    eventDate: string;
  };
}

/** Tambah `days` ke `dateStr` (YYYY-MM-DD); melompati zona waktu agar stabil. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<CaseStatus, string> = {
  Aktif: 'Aktif',
  Putus: 'Putus',
  Banding: 'Banding',
  Kasasi: 'Kasasi',
  PK: 'PK',
  Selesai: 'Selesai',
};

/**
 * Hitung perubahan field perkara + entri timeline untuk satu transisi status.
 * Tidak menyentuh DB. Aturan:
 * - Putus: putusDate=today, upayaDeadline=today+bandingDeadlineDays.
 * - Banding/Kasasi/PK: upayaDeadline=null (tenggat upaya tidak berlaku lagi).
 * - Selesai: upayaDeadline=null, closedDate=today.
 * - Aktif: upayaDeadline=null, closedDate=null (putusDate dibiarkan apa adanya).
 */
export function applyStatusChange(input: StatusChangeInput): StatusChangeResult {
  const { current, newStatus, bandingDeadlineDays, today } = input;

  let putusDate = current.putusDate;
  let upayaDeadline: string | null = null;
  let closedDate: string | null = null;

  if (newStatus === 'Putus') {
    putusDate = today;
    upayaDeadline = addDays(today, bandingDeadlineDays);
  } else if (newStatus === 'Selesai') {
    closedDate = today;
  }
  // Banding/Kasasi/PK/Aktif: upayaDeadline tetap null (default), closedDate null.

  // Pemetaan event_type timeline (PRD §5.4 daftar event_type).
  const eventType: TimelineEventType =
    newStatus === 'Putus'
      ? 'Putusan'
      : newStatus === 'Banding'
        ? 'Banding'
        : newStatus === 'Kasasi'
          ? 'Kasasi'
          : newStatus === 'PK'
            ? 'PK'
            : 'Status'; // Aktif & Selesai → 'Status' (tidak ada tipe khusus)

  const fromLabel = STATUS_LABEL[current.status];
  const toLabel = STATUS_LABEL[newStatus];

  return {
    caseUpdate: { status: newStatus, putusDate, upayaDeadline, closedDate },
    timelineEntry: {
      eventType,
      title: `Status berubah: ${fromLabel} → ${toLabel}`,
      description:
        newStatus === 'Putus'
          ? `Perkara diputus pada ${today}. Batas upaya hukum: ${upayaDeadline}.`
          : `Status perkara diubah menjadi ${toLabel}.`,
      eventDate: today,
    },
  };
}

/** PRD §4 R9 (revisi 18 Okt): hanya Admin yang boleh menyelesaikan/membuka kembali/mengubah perkara Selesai. */
export function canManageSelesai(role: string): boolean {
  return normalizeRole(role) === 'admin';
}

/**
 * Cek apakah user dengan role tertentu boleh mengubah status perkara
 * dari `currentStatus` ke `newStatus`. PRD §4 R9 (Kunci status Selesai):
 * - Transisi **ke** "Selesai" hanya Admin.
 * - Transisi **dari** "Selesai" (mengembalikan ke status lain) hanya Admin.
 * - Transisi lain (Aktif→Putus→Banding→Kasasi→PK) bebas untuk yang berhak U cases.
 *
 * Fungsi murni — tidak menyentuh DB/IO; diuji otomatis (tabel keputusan role × transisi).
 */
export function canChangeStatus(
  role: string,
  currentStatus: CaseStatus,
  newStatus: CaseStatus,
): { allowed: boolean } {
  const involvesSelesai = currentStatus === 'Selesai' || newStatus === 'Selesai';
  if (involvesSelesai && !canManageSelesai(role)) {
    return { allowed: false };
  }
  return { allowed: true };
}
