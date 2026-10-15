/**
 * GET  /api/v1/templates — daftar terkelompok per kategori (semua staf) (Agent E · E6)
 * POST /api/v1/templates — daftarkan template yang sudah diunggah (Admin)
 */
import { ok, parseBody } from '@ekasatra/core';
import { createTemplate, createTemplateSchema, listTemplates } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function GET() {
  return withUser(async ({ db, user }) => ok(await listTemplates(db, user)));
}

export function POST(req: Request) {
  return withUser(async ({ db, user }) => {
    const body = await parseBody(req, createTemplateSchema);
    return ok(await createTemplate(db, user, body));
  });
}
