import type { DbExecutor } from '../kernel/db-helpers';
import type { PortalData, PortalClientSummary } from '@ekasatra/shared';
import { PORTAL_GENERIC_ERROR_MESSAGE, notFound, forbidden } from '@ekasatra/shared';
import { getClientByPortalToken } from '../clients/read';
import {
  getClientCasesForPortal,
  getClientTimelineForPortal,
  getClientSchedulesForPortal,
  getClientDocumentsForPortal,
  verifyClientDocumentOwnership,
} from '../cases/read';
import { getClientSuratMasukForPortal } from '../surat/read';
import { getClientInvoicesForPortal } from '../finance/read';

/**
 * Validasi akses portal klien berdasarkan token.
 * ATURAN KUNCI PRD §5.12: Token salah atau portal dinonaktifkan (portal_enabled = false)
 * HARUS mengembalikan pesan galat generik yang SAMA PERSIS agar tidak membocorkan status akun.
 */
export async function validateClientPortalAccess(
  db: DbExecutor,
  token: string,
): Promise<PortalClientSummary> {
  const client = await getClientByPortalToken(db, token);

  // Jika token tidak ditemukan ATAU portal klien dinonaktifkan
  if (!client || !client.portalEnabled) {
    throw notFound(PORTAL_GENERIC_ERROR_MESSAGE);
  }

  return {
    id: client.id,
    name: client.name,
    clientCode: client.clientCode,
    email: client.email,
    phone: client.phone,
  };
}

/**
 * Ambil seluruh data portal milik klien secara read-only (PRD §5.12 & G3).
 * Seluruh data disaring ketat hanya untuk perkara milik klien tersebut.
 */
export async function getPortalData(
  db: DbExecutor,
  token: string,
): Promise<PortalData> {
  const client = await validateClientPortalAccess(db, token);

  const [cases, timeline, schedules, documents, suratMasuk, invoices] =
    await Promise.all([
      getClientCasesForPortal(db, client.id),
      getClientTimelineForPortal(db, client.id), // sudah tanpa Catatan, Dokumen, Surat
      getClientSchedulesForPortal(db, client.id),
      getClientDocumentsForPortal(db, client.id), // sudah hanya shared_with_client = true
      getClientSuratMasukForPortal(db, client.id),
      getClientInvoicesForPortal(db, client.id),
    ]);

  return {
    client,
    cases,
    timeline,
    schedules,
    documents,
    suratMasuk,
    invoices,
  };
}

/**
 * Verifikasi kepemilikan file oleh klien sebelum pengunduhan file (PRD §5.12 & G3).
 * Mencegah pengunduhan file dokumen milik klien lain atau dokumen internal yang belum dibagikan.
 */
export async function getVerifiedClientDocument(
  db: DbExecutor,
  token: string,
  documentId: string,
): Promise<{ filePath: string; fileName?: string; mimeType?: string }> {
  const client = await validateClientPortalAccess(db, token);

  const verification = await verifyClientDocumentOwnership(
    db,
    client.id,
    documentId,
  );

  if (!verification.verified || !verification.filePath) {
    // Pesan galat generik yang sama demi keamanan
    throw forbidden(PORTAL_GENERIC_ERROR_MESSAGE);
  }

  return {
    filePath: verification.filePath,
    fileName: verification.fileName,
    mimeType: verification.mimeType,
  };
}

