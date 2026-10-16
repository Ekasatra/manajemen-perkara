/**
 * Kernel policy (milik Agent A) — matriks hak akses PRD §4.
 * `can()` murni (tanpa DB/IO) sehingga matriks role × resource × aksi
 * bisa diuji otomatis (mencakup H2).
 *
 * Catatan:
 * - Aksi `C|R|U|D` di sini adalah aksi tabel-level. Pembatasan baris
 *   (scope_assigned_only, kas_viewers, "hanya milik sendiri") ditangani
 *   oleh modul masing-masing di atas hasil `can()`.
 * - Nilai role DB memakai huruf kapital ('Admin' dst.) sedangkan
 *   @ekasatra/shared memakai lowercase + 'viewer'; `normalizeRole()`
 *   adalah satu-satunya titik normalisasi (lihat docs/REQUESTS.md).
 */
import { forbidden, type Role } from '@ekasatra/shared';

export const ACTIONS = ['C', 'R', 'U', 'D'] as const;
export type Action = (typeof ACTIONS)[number];

export const RESOURCES = [
  'users',
  'clients',
  'opponents',
  'advocates',
  'settings',
  'cases',
  'timeline',
  'schedules',
  'case_documents',
  'surat_masuk',
  'surat_keluar',
  'invoices',
  'honor_tim',
  'kas',
  'reports',
  'audit_log',
  'templates',
] as const;
export type Resource = (typeof RESOURCES)[number];

/** Nilai role apa pun (termasuk enum DB berkapital) → Role kanonik lowercase. */
export function normalizeRole(value: string): Role {
  const role = value.trim().toLowerCase();
  if (
    role === 'superadmin' ||
    role === 'admin' ||
    role === 'advokat' ||
    role === 'paralegal' ||
    role === 'viewer'
  ) {
    return role;
  }
  // Least privilege: role tak dikenal diperlakukan sebagai pembaca saja.
  return 'viewer';
}

/** Admin dan Superadmin sama-sama staf pengelola: melihat semua perkara dan surat. */
export function isAdminRole(value: string): boolean {
  const role = normalizeRole(value);
  return role === 'admin' || role === 'superadmin';
}

/**
 * Tabel policy PRD §4. `viewer` tidak ada di PRD → ditetapkan sebagai
 * "read-only yang terlihat staf" (R hanya bila Advokat/Paralegal boleh R).
 * Aksi disimpan sebagai string 'C'/'R'/'U'/'D' berurutan, mis. 'CRU'.
 */
export const POLICY: Record<Resource, Record<Role, string>> = {
  users: { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' },
  clients: { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' },
  opponents: { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' },
  // Data advokat: non-Admin hanya milik sendiri (pembatasan baris di modul C).
  advocates: { superadmin: 'CRUD', admin: 'CRU', advokat: 'RU', paralegal: 'RU', viewer: 'R' },
  settings: { superadmin: 'CRUD', admin: 'CRU', advokat: 'R', paralegal: 'R', viewer: 'R' },
  // "R U + C (tim hanya dirinya)" — pembatasan baris di modul D.
  cases: { superadmin: 'CRUD', admin: 'CRU', advokat: 'RUC', paralegal: 'RU', viewer: 'R' },
  timeline: { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' },
  schedules: { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' },
  case_documents: {
    superadmin: 'CRUD',
    admin: 'CRU',
    advokat: 'CRUD',
    paralegal: 'CRU',
    viewer: 'R',
  },
  surat_masuk: { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRU', paralegal: 'CRU', viewer: 'R' },
  surat_keluar: { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRU', paralegal: 'CRU', viewer: 'R' },
  invoices: { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' },
  // Honor: Admin kelola semua; lainnya lihat milik sendiri (baris di modul F).
  honor_tim: { superadmin: 'CRUD', admin: 'CRU', advokat: 'R', paralegal: 'R', viewer: 'R' },
  // Kas: Admin selalu boleh; non-Admin hanya lewat setting `kas_viewers`
  // (dicek modul F via canViewKas(), bukan di tabel ini).
  kas: { superadmin: 'R', admin: 'R', advokat: '', paralegal: '', viewer: '' },
  reports: { superadmin: 'R', admin: 'R', advokat: '', paralegal: '', viewer: '' },
  audit_log: { superadmin: 'R', admin: 'R', advokat: '', paralegal: '', viewer: '' },
  // Template: semua staf boleh melihat/mengunduh; unggah Admin saja.
  templates: { superadmin: 'CRUD', admin: 'CRU', advokat: 'R', paralegal: 'R', viewer: 'R' },
};

export interface PolicyUser {
  role: string;
}

/** Cek hak akses tabel-level sesuai PRD §4. */
export function can(user: PolicyUser, action: Action, resource: Resource): boolean {
  return POLICY[resource][normalizeRole(user.role)].includes(action);
}

/** `can()` yang melempar AppError FORBIDDEN bila tidak berhak. */
export function ensureCan(user: PolicyUser, action: Action, resource: Resource): void {
  if (!can(user, action, resource)) {
    throw forbidden(`Akses ditolak: ${action} pada ${resource}`);
  }
}

/**
 * Hak lihat kas kantor: Admin selalu boleh, non-Admin hanya bila
 * user id-nya tercantum di setting `kas_viewers` (PRD §4).
 */
export function canViewKas(
  user: PolicyUser & { userId: string },
  kasViewerIds: readonly string[],
): boolean {
  return can(user, 'R', 'kas') || kasViewerIds.includes(user.userId);
}
