/** POST /api/v1/surat-keluar/upload-url — URL unggah langsung ke bucket `surat` (Agent E · E2) */
import { ensureCan, ok, parseBody } from '@ekasatra/core';
import { createUploadTarget, uploadTargetSchema } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function POST(req: Request) {
  return withUser(async ({ user }) => {
    ensureCan(user, 'C', 'surat_keluar');
    const body = await parseBody(req, uploadTargetSchema);
    return ok(
      await createUploadTarget({
        bucket: 'surat',
        prefix: 'keluar',
        userId: user.userId,
        fileName: body.fileName,
        size: body.size,
      }),
    );
  });
}
