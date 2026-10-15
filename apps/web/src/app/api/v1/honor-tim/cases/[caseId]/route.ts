/**
 * GET /api/v1/honor-tim/cases/:caseId — rincian honor (draft + published, kas, dana) — Admin
 * PUT /api/v1/honor-tim/cases/:caseId — simpan draft per anggota — Admin
 */
import { parseBody } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { getHonorOverview, saveHonorDraft } from '@ekasatra/core/honor-tim';
import { saveHonorDraftSchema } from '@ekasatra/shared/honor-tim';
import { route, type RouteParams } from '@/modules/invoices/route-ctx';

export async function GET(_req: Request, { params }: RouteParams<'caseId'>) {
  const caseId = uuidParam((await params).caseId, 'ID perkara');
  return route(({ db, user }) => getHonorOverview(db, user, caseId));
}

export async function PUT(req: Request, { params }: RouteParams<'caseId'>) {
  const caseId = uuidParam((await params).caseId, 'ID perkara');
  return route(async ({ db, user }) => {
    const body = await parseBody(req, saveHonorDraftSchema);
    await saveHonorDraft(db, user, caseId, body.items);
    return getHonorOverview(db, user, caseId);
  });
}
