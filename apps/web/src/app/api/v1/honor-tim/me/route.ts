/** GET /api/v1/honor-tim/me — "honor saya": hanya nilai yang sudah didistribusikan. */
import { listMyHonor } from '@ekasatra/core/honor-tim';
import { route } from '@/modules/invoices/route-ctx';

export function GET() {
  return route(({ db, user }) => listMyHonor(db, user));
}
