/** DELETE /api/v1/templates/[id] — hapus template + berkasnya (Admin) (Agent E · E6) */
import { ok } from '@ekasatra/core';
import { deleteTemplate } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async ({ db, user }) => {
    await deleteTemplate(db, user, (await params).id);
    return ok({ deleted: true });
  });
}
