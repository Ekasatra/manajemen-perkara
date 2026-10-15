/** POST /api/v1/templates/upload-url — URL unggah langsung ke bucket `templates` (Admin) (Agent E · E6) */
import { ensureCan, ok, parseBody } from '@ekasatra/core';
import { TEMPLATE_PREFIX, createUploadTarget, uploadTargetSchema } from '@ekasatra/core/surat';
import { withUser } from '@/modules/surat/route-ctx';

export function POST(req: Request) {
  return withUser(async ({ user }) => {
    ensureCan(user, 'C', 'templates');
    const body = await parseBody(req, uploadTargetSchema);
    return ok(
      await createUploadTarget({
        bucket: 'templates',
        prefix: TEMPLATE_PREFIX,
        userId: user.userId,
        fileName: body.fileName,
        size: body.size,
      }),
    );
  });
}
