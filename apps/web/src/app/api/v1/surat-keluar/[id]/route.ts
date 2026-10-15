/**
 * GET    /api/v1/surat-keluar/[id] — detail + riwayat approval + aksi yang tersedia (Agent E · E2/E5)
 * PATCH  /api/v1/surat-keluar/[id] — ubah (pembuat/Admin saat Draft, reviewer saat Review)
 * DELETE /api/v1/surat-keluar/[id] — hapus (Admin, hanya Draft)
 */
import { ok, parseBody } from '@ekasatra/core';
import {
  deleteSuratKeluar,
  getSuratKeluar,
  updateSuratKeluar,
  updateSuratKeluarSchema,
} from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return withUser(async ({ db, user }) => ok(await getSuratKeluar(db, user, (await params).id)));
}

export function PATCH(req: Request, { params }: Ctx) {
  return withUser(async ({ db, user }) => {
    const body = await parseBody(req, updateSuratKeluarSchema);
    return ok(await updateSuratKeluar(db, user, (await params).id, body));
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return withUser(async ({ db, user }) => {
    await deleteSuratKeluar(db, user, (await params).id);
    return ok({ deleted: true });
  });
}
