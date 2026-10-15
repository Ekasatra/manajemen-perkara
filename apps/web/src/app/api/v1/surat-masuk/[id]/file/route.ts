/** GET /api/v1/surat-masuk/[id]/file — signed URL unduh lampiran (Agent E · E1) */
import { ok } from '@ekasatra/core';
import { suratMasukFileUrl } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async ({ db, user }) =>
    ok({ url: await suratMasukFileUrl(db, user, (await params).id) }),
  );
}
