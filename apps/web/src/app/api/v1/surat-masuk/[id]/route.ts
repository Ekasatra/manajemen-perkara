/**
 * GET    /api/v1/surat-masuk/[id] — detail (Agent E · E1)
 * PATCH  /api/v1/surat-masuk/[id] — ubah / disposisi (assignedTo) / tandai Selesai
 * DELETE /api/v1/surat-masuk/[id] — hapus (Admin)
 */
import { ok, parseBody } from '@ekasatra/core';
import {
  deleteSuratMasuk,
  getSuratMasuk,
  updateSuratMasuk,
  updateSuratMasukSchema,
} from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return withUser(async ({ db, user }) => ok(await getSuratMasuk(db, user, (await params).id)));
}

export function PATCH(req: Request, { params }: Ctx) {
  return withUser(async ({ db, user }) => {
    const body = await parseBody(req, updateSuratMasukSchema);
    return ok(await updateSuratMasuk(db, user, (await params).id, body));
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return withUser(async ({ db, user }) => {
    await deleteSuratMasuk(db, user, (await params).id);
    return ok({ deleted: true });
  });
}
