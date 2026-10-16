'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
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
      <div className="flex flex-wrap gap-2">
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
          <label htmlFor="ap-note" className={labelClass}>
            Catatan{dialog === 'Reject' ? ' (wajib)' : ' (opsional)'}
          </label>
          <textarea
            id="ap-note"
            name="note"
            rows={3}
            required={dialog === 'Reject'}
            className={inputClass}
          />
        </div>
        {dialog === 'Sign' ? (
          <div>
            <label htmlFor="ap-signed" className={labelClass}>
              File bertanda tangan (opsional)
            </label>
            <input id="ap-signed" name="signedFile" type="file" className={inputClass} />
          </div>
        ) : null}
        {dialog === 'Send' ? (
          <div>
            <label htmlFor="ap-email" className={labelClass}>
              Kirim via email ke (opsional)
            </label>
            <input id="ap-email" name="sendToEmail" type="email" className={inputClass} />
          </div>
        ) : null}
      </FormDialog>
    </div>
  );
}
