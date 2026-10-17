/**
 * Pengaturan Sistem gaya GAS: kartu bagian (profil kantor, tipe & kas, alur kerja, logo) dan
 * tabel matriks peran & hak akses yang dibaca langsung dari kebijakan server (POLICY).
 * R7: hanya SuperAdmin/Admin; Advokat/Paralegal ditolak lewat `requireCan` (403).
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { createDb, profiles, settings } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, can, POLICY, RESOURCES } from '@ekasatra/core';
import { requireCan } from '@/lib/guard';
import { SettingsForm } from '@/modules/settings/settings-form';
import type { MatrixRow } from '@/modules/settings/settings-form';

const RESOURCE_LABEL: Record<string, string> = {
  surat_masuk: 'Surat Masuk',
  surat_keluar: 'Surat Keluar',
  clients: 'Klien',
  opponents: 'Pihak Lawan',
  cases: 'Perkara',
  timeline: 'Timeline',
  schedules: 'Jadwal',
  case_documents: 'Dokumen',
  invoices: 'Biaya Perkara',
  honor_tim: 'Honor Tim',
  kas: 'Kas Kantor',
  advocates: 'Data Advokat*',
  templates: 'Template Surat',
  reports: 'Laporan',
  audit_log: 'Audit Log',
  users: 'User',
  settings: 'Pengaturan',
};
const ROLES = ['superadmin', 'admin', 'advokat', 'paralegal'] as const;
// Urutan baca/tambah/ubah/hapus ditulis L T U H seperti di aplikasi GAS.
const LETTER: [string, string][] = [
  ['R', 'L'],
  ['C', 'T'],
  ['U', 'U'],
  ['D', 'H'],
];

export default async function SettingsPage() {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  // PRD-MASUKAN §4 R7: Advokat/Paralegal tidak berhak membuka Pengaturan (§6).
  requireCan(user, 'R', 'settings');

  const [rows, leaders] = await Promise.all([
    db.select().from(settings),
    db
      .select({ id: profiles.id, name: profiles.fullName })
      .from(profiles)
      .where(
        and(
          eq(profiles.isActive, true),
          inArray(profiles.role, ['Admin', 'SuperAdmin', 'Advokat']),
        ),
      )
      .orderBy(asc(profiles.fullName)),
  ]);
  const allSettings: Record<string, unknown> = {};
  for (const row of rows) allSettings[row.key] = row.value;

  const matrix: MatrixRow[] = RESOURCES.map((res) => ({
    label: RESOURCE_LABEL[res] ?? res,
    cells: ROLES.map((role) => {
      const allowed = POLICY[res][role];
      return LETTER.filter(([code]) => allowed.includes(code))
        .map(([, letter]) => letter)
        .join('');
    }),
  }));

  return (
    <SettingsForm
      initialSettings={allSettings}
      canEdit={can(user, 'U', 'settings')}
      leaders={leaders}
      matrix={matrix}
      roleHeaders={['Super Admin', 'Admin', 'Advokat', 'Paralegal']}
    />
  );
}
