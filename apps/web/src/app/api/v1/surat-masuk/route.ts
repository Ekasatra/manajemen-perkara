/**
 * GET  /api/v1/surat-masuk — daftar (paginasi server; filter q/status/caseId/mine) (Agent E · E1)
 * POST /api/v1/surat-masuk — catat surat masuk, no_agenda SM/{tahun}/{0001}
 */
import { ok, parseBody } from '@ekasatra/core';
import { createSuratMasuk, createSuratMasukSchema, listSuratMasuk } from '@ekasatra/core/surat';
import { parsePageQuery } from '@/lib/pagination';
import { withUser } from '@/modules/surat/route-ctx';

const STATUS = ['Belum', 'Didisposisi', 'Selesai'] as const;

export function GET(req: Request) {
  return withUser(async ({ db, user }) => {
    const sp = new URL(req.url).searchParams;
    const { page, pageSize, offset } = parsePageQuery(Object.fromEntries(sp.entries()));
    const status = STATUS.find((s) => s === sp.get('status')) ?? null;
    const { rows, total } = await listSuratMasuk(db, user, {
      q: sp.get('q'),
      status,
      caseId: sp.get('caseId'),
      mine: sp.get('mine') === '1',
      page: { pageSize, offset },
    });
    return ok({ rows, page, pageSize, total });
  });
}

export function POST(req: Request) {
  return withUser(async ({ db, user }) => {
    const body = await parseBody(req, createSuratMasukSchema);
    return ok(await createSuratMasuk(db, user, body));
  });
}
