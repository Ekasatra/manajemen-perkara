/** GET /api/v1/templates/[id]/file — signed URL unduh template (semua staf) (Agent E · E6) */
import { ok } from '@ekasatra/core';
import { templateFileUrl } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async ({ db, user }) => ok({ url: await templateFileUrl(db, user, (await params).id) }));
}
