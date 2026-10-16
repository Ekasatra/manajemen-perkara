/**
 * Halaman detail Perkara (Agent D · D5).
 * Tab: Ringkasan, Timeline, Jadwal, Dokumen, Surat, Biaya (Admin).
 * Surat & biaya read-only — data dari fungsi baca modul E/F.
 */
import { asc, eq } from 'drizzle-orm';
import {
  createDb,
  cases,
  caseTimeline,
  caseSchedules,
  caseDocuments,
  clients,
  opponents,
} from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  requireUser,
  ensureCan,
  can,
  getCaseForUser,
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
import { CaseFlow } from '@/modules/cases/case-flow';
import { CaseTabs } from '@/modules/cases/case-tabs';
import { CaseActions } from '@/modules/cases/case-actions';
import { todayWib } from '@/modules/dashboard/metrics';

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'cases');

  // Gerbang hak lihat per baris (scope_assigned_only): perkara yang bukan milik/tim user dijawab
  // "tidak ditemukan", bukan "dilarang", supaya keberadaannya tidak bocor.
  if (!(await getCaseForUser(db, id, user.userId, user.role)))
    throw notFound('Perkara tidak ditemukan');
  const [caseRow] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  if (!caseRow) throw notFound('Perkara tidak ditemukan');

  const [clientRow, opponentRow, timeline, schedules, documents, members] = await Promise.all([
    db
      .select({ name: clients.name, clientCode: clients.clientCode })
      .from(clients)
      .where(eq(clients.id, caseRow.clientId))
      .limit(1),
    caseRow.opponentId
      ? db
          .select({ name: opponents.name })
          .from(opponents)
          .where(eq(opponents.id, caseRow.opponentId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(caseTimeline)
      .where(eq(caseTimeline.caseId, id))
      .orderBy(caseTimeline.eventDate),
    db
      .select()
      .from(caseSchedules)
      .where(eq(caseSchedules.caseId, id))
      .orderBy(caseSchedules.scheduleDate),
    db
      .select()
      .from(caseDocuments)
      .where(eq(caseDocuments.caseId, id))
      .orderBy(caseDocuments.createdAt),
    getCaseTeamMembers(db, id),
  ]);

  const clientName = clientRow[0]?.name ?? '-';
  const clientCode = clientRow[0]?.clientCode ?? '-';
  const opponentName = opponentRow[0]?.name ?? null;

  // Hak akses via can() dari kernel — tidak ada if role === di UI.
  const canUpdate = can(user, 'U', 'cases');
  const canManageTeam = can(user, 'C', 'users');
  const canViewBiaya = can(user, 'R', 'invoices');
  const canDelete = can(user, 'D', 'cases');

  // Pilihan klien/lawan untuk form ubah: hanya bila user berhak membaca masterannya.
  const [clientOptions, opponentOptions] = await Promise.all([
    canUpdate && can(user, 'R', 'clients')
      ? db
          .select({ id: clients.id, name: clients.name, code: clients.clientCode })
          .from(clients)
          .orderBy(asc(clients.name))
          .then((rs) => rs.map((r) => ({ id: r.id, label: `${r.code} · ${r.name}` })))
      : null,
    canUpdate && can(user, 'R', 'opponents')
      ? db
          .select({ id: opponents.id, name: opponents.name })
          .from(opponents)
          .orderBy(asc(opponents.name))
          .then((rs) => rs.map((r) => ({ id: r.id, label: r.name })))
      : null,
  ]);

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
        actions={
          canUpdate || canDelete ? (
            <CaseActions
              row={caseRow}
              clientOptions={clientOptions}
              opponentOptions={opponentOptions}
              canEdit={canUpdate}
              canDelete={canDelete}
            />
          ) : undefined
        }
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

      <CaseFlow
        status={caseRow.status}
        startDate={caseRow.startDate}
        putusDate={caseRow.putusDate}
        closedDate={caseRow.closedDate}
        upayaDeadline={caseRow.upayaDeadline}
        events={timeline}
        today={todayWib()}
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
