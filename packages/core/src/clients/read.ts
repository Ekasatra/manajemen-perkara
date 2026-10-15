import { eq, gte, sql } from 'drizzle-orm';
import { clients } from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';
import type { PortalClientSummary } from '@ekasatra/shared';

/**
 * Cari klien berdasarkan token portal untuk akses Portal Klien (PRD §5.12).
 * Catatan: Verifikasi portalEnabled dilakukan di layer portal service.
 */
export async function getClientByPortalToken(
  db: DbExecutor,
  token: string,
): Promise<(PortalClientSummary & { portalEnabled: boolean }) | null> {
  if (!token || token.trim().length === 0) {
    return null;
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      clientCode: clients.clientCode,
      email: clients.email,
      phone: clients.phone,
      portalEnabled: clients.portalEnabled,
    })
    .from(clients)
    .where(eq(clients.portalToken, token.trim()))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Jumlah klien baru yang terdaftar bulan ini (PRD §5.10).
 */
export async function getNewClientsCountThisMonth(
  db: DbExecutor,
  startOfMonthStr: string,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(clients)
    .where(gte(clients.createdAt, new Date(startOfMonthStr)));

  return rows[0]?.count ?? 0;
}

/**
 * Daftar ringkas klien untuk opsi filter dropdown laporan.
 */
export async function listClientsForReportOptions(
  db: DbExecutor,
): Promise<{ id: string; name: string; clientCode: string }[]> {
  return db
    .select({
      id: clients.id,
      name: clients.name,
      clientCode: clients.clientCode,
    })
    .from(clients)
    .orderBy(clients.name);
}

