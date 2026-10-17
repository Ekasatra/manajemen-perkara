/** GET /api/v1/surat-keluar/[id]/file?which=file|signed — signed URL unduh berkas (Agent E · E5)
 *  Default `which=signed` agar endpoint tidak pernah diam-diam mengembalikan berkas belum
 *  ditandatangani saat dipanggil tanpa parameter (P-W1 / R5). */
import { ok } from '@ekasatra/core';
import { suratKeluarFileUrl } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async ({ db, user }) => {
    const which = new URL(req.url).searchParams.get('which') === 'file' ? 'file' : 'signed';
    return ok({ url: await suratKeluarFileUrl(db, user, (await params).id, which) });
  });
}
