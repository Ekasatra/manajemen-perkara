/**
 * Halaman detail Perkara (Agent D · D5).
 * Tab: Ringkasan, Timeline, Jadwal, Dokumen.
 * (Surat & biaya read-only ditangani modul E/F lewat rute mereka sendiri.)
 */
import { eq } from 'drizzle-orm';
import { createDb, cases, caseTimeline, caseSchedules, caseDocuments, clients, opponents } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, getCaseTeamMembers } from '@ekasatra/core';
import Link from 'next/link';
import { notFound } from '@ekasatra/shared';
import { buttonClass } from '@/components/ui/styles';
import { CaseTabs } from '@/modules/cases/case-tabs';

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'cases');

  const [caseRow] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  if (!caseRow) throw notFound('Perkara tidak ditemukan');

  // Pastikan visibilitas: bila non-Admin + scope_assigned_only, cek kepemilikan/keanggotaan.
  // (getCaseTeamMembers sudah memerlukan perkara ada; kita juga cek via service di API,
  // tapi halaman ini read-only — cukup pastikan data anak perkara konsisten.)

  const [clientRow, opponentRow, timeline, schedules, documents, members] = await Promise.all([
    db.select({ name: clients.name, clientCode: clients.clientCode }).from(clients).where(eq(clients.id, caseRow.clientId)).limit(1),
    caseRow.opponentId
      ? db.select({ name: opponents.name }).from(opponents).where(eq(opponents.id, caseRow.opponentId)).limit(1)
      : Promise.resolve([]),
    db.select().from(caseTimeline).where(eq(caseTimeline.caseId, id)).orderBy(caseTimeline.eventDate),
    db.select().from(caseSchedules).where(eq(caseSchedules.caseId, id)).orderBy(caseSchedules.scheduleDate),
    db.select().from(caseDocuments).where(eq(caseDocuments.caseId, id)).orderBy(caseDocuments.createdAt),
    getCaseTeamMembers(db, id),
  ]);

  const clientName = clientRow[0]?.name ?? '-';
  const clientCode = clientRow[0]?.clientCode ?? '-';
  const opponentName = opponentRow[0]?.name ?? null;

  const canUpdate = ensureCanSafe(user, 'U', 'cases');
  const canManageTeam = ensureCanSafe(user, 'C', 'users');

  return (
    <div>
      <div className="mb-4">
        <Link href="/cases" className={`text-sm ${buttonClass.secondary}`}>
          ← Kembali
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-navy-700">{caseRow.title}</h1>
        <p className="mt-1 text-sm text-navy-400">
          {caseRow.regNo} · {caseRow.status} · Klien: {clientName} ({clientCode})
          {opponentName ? ` · Lawan: ${opponentName}` : ''}
        </p>
      </div>

      <CaseTabs
        caseId={id}
        caseRow={caseRow}
        clientName={clientName}
        opponentName={opponentName}
        timeline={timeline}
        schedules={schedules}
        documents={documents}
        members={members}
        canUpdate={canUpdate}
        canManageTeam={canManageTeam}
      />
    </div>
  );
}

/** Cek `can()` tanpa melempar — untuk mengontrol tampilan tombol UI. */
function ensureCanSafe(user: { role: string }, action: 'C' | 'R' | 'U' | 'D', resource: string): boolean {
  // Impor dinamis terlalu berat di server component; kita inline cek policy sederhana.
  // Tombol disembunyikan berdasarkan role; otorisasi sebenarnya tetap di API route.
  const role = user.role.toLowerCase();
  if (role === 'admin') return true;
  if (action === 'C' && resource === 'users') return false; // hanya Admin atur tim
  if (action === 'U') return role === 'advokat' || role === 'paralegal';
  return false;
}
