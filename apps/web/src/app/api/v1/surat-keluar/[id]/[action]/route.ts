/**
 * POST /api/v1/surat-keluar/[id]/{submit|approve|reject|sign|send} (Agent E · E4)
 * Body opsional: { note, signedFilePath (sign), sendToEmail (send) }.
 * Aturan perpindahan status ada di @ekasatra/core/surat (`transition`).
 */
import { ok, parseBody } from '@ekasatra/core';
import { applySuratAction, approvalActionSchema, type ApprovalAction } from '@ekasatra/core/surat';
import { notFound } from '@ekasatra/shared';
import { withUser } from '@/modules/surat/route-ctx';

const SLUG: Record<string, ApprovalAction> = {
  submit: 'Submit',
  approve: 'Approve',
  reject: 'Reject',
  sign: 'Sign',
  send: 'Send',
};

export function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  return withUser(async ({ db, user }) => {
    const { id, action } = await params;
    const mapped = SLUG[action];
    if (!mapped) throw notFound('Aksi tidak dikenal');
    const body = await parseBody(req, approvalActionSchema);
    return ok(await applySuratAction(db, user, id, mapped, body));
  });
}
