/** GET /api/v1/honor-tim — daftar perkara berhonor + state & kas per perkara (Admin). */
import { parseQuery } from '@ekasatra/core/finance';
import { listHonorCases } from '@ekasatra/core/honor-tim';
import { listHonorCasesQuerySchema } from '@ekasatra/shared/honor-tim';
import { route } from '@/modules/invoices/route-ctx';

export function GET(req: Request) {
  return route(({ db, user }) =>
    listHonorCases(db, user, parseQuery(req, listHonorCasesQuerySchema)),
  );
}
