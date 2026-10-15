/** GET /api/v1/kas — ringkasan kas kantor. Hanya Admin + user di setting `kas_viewers`. */
import { getKasSummary } from '@ekasatra/core/honor-tim';
import { route } from '@/modules/invoices/route-ctx';

export function GET() {
  return route(({ db, user }) => getKasSummary(db, user));
}
