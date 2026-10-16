/** Jenis perkara, sama dengan aplikasi GAS. */
export const CASE_TYPES = [
  'Perdata',
  'Pidana',
  'Tata Usaha Negara',
  'Niaga / Kepailitan',
  'PKPU',
  'Hubungan Industrial',
  'Agama',
  'Arbitrase',
  'Uji Materiil',
  'Non-Litigasi / Konsultasi',
  'Lainnya',
] as const;

/** Tahap awal timeline saat registrasi (subset enum timeline yang relevan). */
export const INITIAL_TIMELINE_TYPES = ['Status', 'Dokumen', 'Surat', 'Catatan', 'Lainnya'] as const;
