/**
 * GET/PATCH/DELETE /api/v1/invoices/:id (Admin)
 * Status tidak bisa diubah langsung — dihitung dari paid_amount (PRD §5.8).
 */
import { ensureCan, parseBody } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { deleteInvoice, getInvoice, updateInvoice } from '@ekasatra/core/invoices';
import { updateInvoiceSchema } from '@ekasatra/shared/invoices';
import { route, type RouteParams } from '@/modules/invoices/route-ctx';

export async function GET(_req: Request, { params }: RouteParams<'id'>) {
  const id = uuidParam((await params).id);
  return route(({ db, user }) => getInvoice(db, user, id));
}

export async function PATCH(req: Request, { params }: RouteParams<'id'>) {
  const id = uuidParam((await params).id);
  return route(async ({ db, user }) =>
    updateInvoice(
      db,
      user,
      id,
      (ensureCan(user, 'U', 'invoices'), await parseBody(req, updateInvoiceSchema)),
    ),
  );
}

export async function DELETE(_req: Request, { params }: RouteParams<'id'>) {
  const id = uuidParam((await params).id);
  return route(async ({ db, user }) => {
    await deleteInvoice(db, user, id);
    return { id };
  });
}
