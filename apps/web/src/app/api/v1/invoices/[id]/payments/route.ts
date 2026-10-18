/** POST /api/v1/invoices/:id/payments — catat pembayaran (menambah paid_amount). */
import { ensureCan, parseBody } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { recordPayment } from '@ekasatra/core/invoices';
import { recordPaymentSchema } from '@ekasatra/shared/invoices';
import { route, type RouteParams } from '@/modules/invoices/route-ctx';

export async function POST(req: Request, { params }: RouteParams<'id'>) {
  const id = uuidParam((await params).id);
  return route(async ({ db, user }) =>
    recordPayment(
      db,
      user,
      id,
      (ensureCan(user, 'U', 'invoices'), await parseBody(req, recordPaymentSchema)),
    ),
  );
}
