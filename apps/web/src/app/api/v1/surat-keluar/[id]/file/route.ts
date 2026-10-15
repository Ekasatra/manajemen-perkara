/** GET /api/v1/surat-keluar/[id]/file?which=signed — signed URL unduh berkas (Agent E · E5) */
import { ok } from '@ekasatra/core';
import { suratKeluarFileUrl } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async ({ db, user }) => {
    const which = new URL(req.url).searchParams.get('which') === 'signed' ? 'signed' : 'file';
    return ok({ url: await suratKeluarFileUrl(db, user, (await params).id, which) });
  });
}
