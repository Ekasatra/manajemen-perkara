/**
 * Nilai awal tabel `settings`. Dipakai oleh seed (idempoten: tidak menimpa nilai yang sudah ada).
 * Nilai bertanda ? diturunkan dari PRD dan belum dikonfirmasi terhadap DEFAULT_SETTINGS v1.
 */
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  // Profil kantor (kop PDF invoice/kuitansi)
  office_name: 'EKASATRA Law & Policy Advisory',
  office_address: '',
  office_phone: '',
  office_email: '',
  logo_path: '', // path di bucket `settings`

  // Aturan bisnis
  scope_assigned_only: true,
  banding_deadline_days: 14,
  kas_kantor_persen: 20,
  reminder_days: 3, // ?
  notif_email_enabled: true,
  pimpinan_user_id: '', // kosong → Admin pertama
  kas_viewers: [] as string[], // user id non-Admin yang boleh melihat kas

  // Daftar dinamis (Admin boleh menambah)
  client_types: ['Perorangan', 'Perusahaan', 'Instansi'], // ?
  opponent_types: ['Perorangan', 'Perusahaan', 'Instansi'], // ?
};
