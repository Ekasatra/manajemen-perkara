import { pgEnum } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['SuperAdmin', 'Admin', 'Advokat', 'Paralegal']);

export const caseStatus = pgEnum('case_status', [
  'Aktif',
  'Putus',
  'Banding',
  'Kasasi',
  'PK',
  'Selesai',
]);

export const caseMemberRole = pgEnum('case_member_role', ['Advokat', 'Paralegal', 'Manager']);

export const timelineEventType = pgEnum('timeline_event_type', [
  'Status',
  'Putusan',
  'Banding',
  'Kasasi',
  'PK',
  'Catatan',
  'Dokumen',
  'Surat',
  'Lainnya',
]);

export const suratMasukStatus = pgEnum('surat_masuk_status', ['Belum', 'Didisposisi', 'Selesai']);

export const suratKeluarStatus = pgEnum('surat_keluar_status', [
  'Draft',
  'Review',
  'Siap_TTD',
  'Ditandatangani',
  'Terkirim',
]);

export const suratKeluarJenis = pgEnum('surat_keluar_jenis', ['Perkara', 'Instansi']);

export const approvalAction = pgEnum('approval_action', [
  'Submit',
  'Approve',
  'Reject',
  'Sign',
  'Send',
]);

export const honorStatus = pgEnum('honor_status', ['Belum', 'Dibayar']);
