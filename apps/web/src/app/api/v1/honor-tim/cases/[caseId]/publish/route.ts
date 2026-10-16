/**
 * POST /api/v1/honor-tim/cases/:caseId/publish — distribusikan honor (Admin).
 * Email ke anggota yang honornya berubah dikirim oleh `publishHonor` sesudah commit.
 */
import { uuidParam } from '@ekasatra/core/finance';
import { publishHonor } from '@ekasatra/core/honor-tim';
import { route, type RouteParams } from '@/modules/invoices/route-ctx';

export async function POST(_req: Request, { params }: RouteParams<'caseId'>) {
  const caseId = uuidParam((await params).caseId, 'ID perkara');
  return route(({ db, user }) => publishHonor(db, user, caseId));
}
