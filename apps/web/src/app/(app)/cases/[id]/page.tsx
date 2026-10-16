/**
 * Halaman detail Perkara (Agent D · D5).
 * Tab: Ringkasan, Timeline, Jadwal, Dokumen, Surat, Biaya (Admin).
 * Surat & biaya read-only — data dari fungsi baca modul E/F.
 */
import { eq } from 'drizzle-orm';
import { createDb, cases, caseTimeline, caseSchedules, caseDocuments, clients, opponents } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  requireUser,
  ensureCan,
  can,
  getCaseTeamMembers,
  listSuratMasukForReport,
  listSuratKeluarForReport,
  listInvoicesForReport,
  listHonorariumForReport,
} from '@ekasatra/core';
import { notFound } from '@ekasatra/shared';
import { FileHeader } from '@/components/ui/file-header';
import { formatDate } from '@/lib/format';
import { CaseStatusBadge } from '@/modules/cases/case-status-badge';
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

  // Hak akses via can() dari kernel — tidak ada if role === di UI.
  const canUpdate = can(user, 'U', 'cases');
  const canManageTeam = can(user, 'C', 'users');
  const canViewBiaya = can(user, 'R', 'invoices');

  // Tab Surat: surat masuk & keluar untuk perkara ini (read-only).
  const [suratMasuk, suratKeluar] = await Promise.all([
    listSuratMasukForReport(db, { caseId: id }),
    listSuratKeluarForReport(db, { caseId: id }),
  ]);

  // Tab Biaya: invoice & honorarium (Admin only, read-only).
  const invoices = canViewBiaya ? await listInvoicesForReport(db, { caseId: id }) : [];
  const honorarium = canViewBiaya ? await listHonorariumForReport(db, { caseId: id }) : [];

  return (
    <div>
      <FileHeader
        back={{ href: '/cases', label: 'Perkara' }}
        reference={caseRow.regNo}
        status={<CaseStatusBadge status={caseRow.status} />}
        title={caseRow.title}
        facts={[
          { label: 'Nomor perkara', value: caseRow.caseNumber ?? '-' },
          { label: 'Pengadilan', value: caseRow.court ?? '-' },
          { label: 'Klien', value: `${clientName} (${clientCode})` },
          { label: 'Pihak lawan', value: opponentName ?? '-' },
          { label: 'Jenis perkara', value: caseRow.caseType ?? '-' },
          { label: 'Tanggal mulai', value: formatDate(caseRow.startDate) },
          { label: 'Batas upaya hukum', value: formatDate(caseRow.upayaDeadline) },
        ]}
      />

      <CaseTabs
        caseId={id}
        caseRow={caseRow}
        clientName={clientName}
        opponentName={opponentName}
        timeline={timeline}
        schedules={schedules}
        documents={documents}
        members={members}
        suratMasuk={suratMasuk}
        suratKeluar={suratKeluar}
        invoices={invoices}
        honorarium={honorarium}
        canUpdate={canUpdate}
        canManageTeam={canManageTeam}
        canViewBiaya={canViewBiaya}
      />
    </div>
  );
}
