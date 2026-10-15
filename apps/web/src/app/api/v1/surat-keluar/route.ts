/**
 * GET  /api/v1/surat-keluar — daftar (paginasi server, filter q/status/jenis/caseId) (Agent E · E2)
 * POST /api/v1/surat-keluar — buat surat Draft
 */
import { ok, parseBody } from '@ekasatra/core';
import {
  SURAT_KELUAR_STATUS,
  createSuratKeluar,
  createSuratKeluarSchema,
  listSuratKeluar,
  type SuratKeluarStatus,
} from '@ekasatra/core/surat';
import { parsePageQuery } from '@/lib/pagination';
import { withUser } from '@/modules/surat/route-ctx';

export function GET(req: Request) {
  return withUser(async ({ db, user }) => {
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, offset } = parsePageQuery(Object.fromEntries(sp.entries()));
    const status = sp.get('status') as SuratKeluarStatus | null;
    const jenis = sp.get('jenis');
    const { rows, total } = await listSuratKeluar(db, user, {
      q: sp.get('q'),
      status: status && SURAT_KELUAR_STATUS.includes(status) ? status : null,
      jenis: jenis === 'Perkara' || jenis === 'Instansi' ? jenis : null,
      caseId: sp.get('caseId'),
      page: { pageSize, offset },
    });
    return ok({ rows, page, pageSize, total });
  });
}

export function POST(req: Request) {
  return withUser(async ({ db, user }) => {
    const body = await parseBody(req, createSuratKeluarSchema);
    return ok(await createSuratKeluar(db, user, body));
  });
}
