'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { FieldError, Label } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { callApi, uploadFile } from '@/modules/surat/upload';

type Action = 'Submit' | 'Approve' | 'Reject' | 'Sign' | 'Send';

const LABEL: Record<Action, string> = {
  Submit: 'Ajukan',
  Approve: 'Setujui',
  Reject: 'Tolak',
  Sign: 'Tanda tangani',
  Send: 'Kirim',
};

/** Tombol hanya yang diizinkan server (`availableActions`); server tetap memvalidasi ulang. */
export function ApprovalActions({ id, actions }: { id: string; actions: Action[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(action: Action, body: unknown = {}) {
    await callApi(`/api/v1/surat-keluar/${id}/${action.toLowerCase()}`, 'POST', body);
    setDialog(null);
    router.refresh();
  }

  async function direct(action: Action) {
    setBusy(true);
    setError(null);
    try {
      await post(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal');
    } finally {
      setBusy(false);
    }
  }

  async function submitDialog(fd: FormData) {
    const note = String(fd.get('note') ?? '').trim() || null;
    if (dialog === 'Sign') {
      const f = fd.get('signedFile');
      const up = f instanceof File && f.size > 0 ? await uploadFile('surat-keluar', f) : null;
      return post('Sign', { note, signedFilePath: up?.path ?? null });
    }
    if (dialog === 'Send') {
      const email = String(fd.get('sendToEmail') ?? '').trim() || null;
      return post('Send', { note, sendToEmail: email });
    }
    return post('Reject', { note });
  }

  if (actions.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-[12px]">
        {actions.map((a) =>
          a === 'Submit' || a === 'Approve' ? (
            <button
              key={a}
              type="button"
              disabled={busy}
              onClick={() => void direct(a)}
              className={buttonClass.primary}
            >
              {LABEL[a]}
            </button>
          ) : (
            <button
              key={a}
              type="button"
              onClick={() => setDialog(a)}
              className={a === 'Reject' ? buttonClass.secondary : buttonClass.primary}
            >
              {LABEL[a]}
            </button>
          ),
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger-fg">
          {error}
        </p>
      ) : null}

      <FormDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog ? LABEL[dialog] : ''}
        submitLabel={dialog ? LABEL[dialog] : 'Simpan'}
        onSubmit={submitDialog}
      >
        <div>
          <Label htmlFor="ap-note" required={dialog === 'Reject'}>
            Catatan{dialog === 'Reject' ? ' (wajib)' : ' (opsional)'}
          </Label>
          <textarea
            id="ap-note"
            name="note"
            rows={3}
            required={dialog === 'Reject'}
            aria-describedby="err-note"
            className={inputClass}
          />
          <FieldError name="note" />
        </div>
        {dialog === 'Sign' ? (
          <div>
            <Label htmlFor="ap-signed">File bertanda tangan (opsional)</Label>
            <input
              id="ap-signed"
              name="signedFile"
              type="file"
              aria-describedby="err-signedFilePath"
              className={inputClass}
            />
            <FieldError name="signedFilePath" />
          </div>
        ) : null}
        {dialog === 'Send' ? (
          <div>
            <Label htmlFor="ap-email">Kirim via email ke (opsional)</Label>
            <input
              id="ap-email"
              name="sendToEmail"
              type="email"
              aria-describedby="err-sendToEmail"
              className={inputClass}
            />
            <FieldError name="sendToEmail" />
          </div>
        ) : null}
      </FormDialog>
    </div>
  );
}
