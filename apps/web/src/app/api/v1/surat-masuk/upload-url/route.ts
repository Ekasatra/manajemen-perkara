/** POST /api/v1/surat-masuk/upload-url — URL unggah langsung lampiran surat masuk (Agent E · E1) */
import { ensureCan, ok, parseBody } from '@ekasatra/core';
import { createUploadTarget, uploadTargetSchema } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function POST(req: Request) {
  return withUser(async ({ user }) => {
    ensureCan(user, 'C', 'surat_masuk');
    const body = await parseBody(req, uploadTargetSchema);
    return ok(
      await createUploadTarget({
        bucket: 'surat',
        prefix: 'masuk',
        userId: user.userId,
        fileName: body.fileName,
        size: body.size,
      }),
    );
  });
}
