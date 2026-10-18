/** POST /api/v1/invoices/:id/mark-paid — tandai Lunas (paid_amount = amount). Body opsional. */
import { ensureCan, parseBody } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { markPaid } from '@ekasatra/core/invoices';
import { markPaidSchema } from '@ekasatra/shared/invoices';
import { route, type RouteParams } from '@/modules/invoices/route-ctx';

export async function POST(req: Request, { params }: RouteParams<'id'>) {
  const id = uuidParam((await params).id);
  const hasBody = Number(req.headers.get('content-length') ?? 0) > 0;
  return route(async ({ db, user }) =>
    markPaid(
      db,
      user,
      id,
      (ensureCan(user, 'U', 'invoices'), hasBody ? await parseBody(req, markPaidSchema) : {}),
    ),
  );
}
