import { describe, expect, it } from 'vitest';
import {
  badgeLabel,
  notificationAriaLabel,
  unreadSummary,
} from '../src/shell/notification-format';

/**
 * R8 — badge dan label selalu menyatakan jumlah BELUM dibaca.
 */
describe('badge notifikasi', () => {
  it('hilang saat tidak ada yang belum dibaca', () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(-1)).toBeNull();
    expect(badgeLabel(Number.NaN)).toBeNull();
  });

  it('menampilkan angka apa adanya sampai 9', () => {
    expect(badgeLabel(1)).toBe('1');
    expect(badgeLabel(9)).toBe('9');
  });

  it('memadatkan di atas 9 menjadi 9+', () => {
    expect(badgeLabel(10)).toBe('9+');
    expect(badgeLabel(150)).toBe('9+');
  });

  it('label aksesibel menyebut "belum dibaca" dan angka yang sama', () => {
    expect(notificationAriaLabel(3)).toBe('Notifikasi, 3 belum dibaca');
    expect(notificationAriaLabel(0)).toBe('Notifikasi, tidak ada yang belum dibaca');
  });

  it('ringkasan panel konsisten dengan hitungan', () => {
    expect(unreadSummary(4)).toBe('4 belum dibaca');
    expect(unreadSummary(0)).toBe('Semua sudah dibaca');
  });
});
