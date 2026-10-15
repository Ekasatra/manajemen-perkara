/**
 * POST   .../members/:userId/paid — tandai honor Dibayar (Admin)
 * DELETE .../members/:userId/paid — batalkan status Dibayar
 */
import { uuidParam } from '@ekasatra/core/finance';
import { setHonorPaid } from '@ekasatra/core/honor-tim';
import { route, type RouteParams } from '@/modules/invoices/route-ctx';

type P = RouteParams<'caseId' | 'userId'>;

async function ids(params: P['params']) {
  const p = await params;
  return { caseId: uuidParam(p.caseId, 'ID perkara'), userId: uuidParam(p.userId, 'ID user') };
}

export async function POST(_req: Request, { params }: P) {
  const { caseId, userId } = await ids(params);
  return route(async ({ db, user }) => {
    await setHonorPaid(db, user, caseId, userId, true);
    return { caseId, userId, status: 'Dibayar' };
  });
}

export async function DELETE(_req: Request, { params }: P) {
  const { caseId, userId } = await ids(params);
  return route(async ({ db, user }) => {
    await setHonorPaid(db, user, caseId, userId, false);
    return { caseId, userId, status: 'Belum' };
  });
}
