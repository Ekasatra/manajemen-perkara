/**
 * Format label notifikasi (R8) — dipisah agar bisa diuji tanpa merender komponen.
 */

/** Angka badge: 0 → null (badge hilang), >9 → "9+". */
export function badgeLabel(unreadCount: number): string | null {
  if (!Number.isFinite(unreadCount) || unreadCount <= 0) return null;
  return unreadCount > 9 ? '9+' : String(Math.floor(unreadCount));
}

/** Label aksesibel lonceng: selalu menyebut jumlah yang BELUM dibaca. */
export function notificationAriaLabel(unreadCount: number): string {
  const count = Number.isFinite(unreadCount) && unreadCount > 0 ? Math.floor(unreadCount) : 0;
  return count > 0
    ? `Notifikasi, ${count} belum dibaca`
    : 'Notifikasi, tidak ada yang belum dibaca';
}

/** Ringkasan singkat di kepala panel. */
export function unreadSummary(unreadCount: number): string {
  const count = Number.isFinite(unreadCount) && unreadCount > 0 ? Math.floor(unreadCount) : 0;
  return count > 0 ? `${count} belum dibaca` : 'Semua sudah dibaca';
}
