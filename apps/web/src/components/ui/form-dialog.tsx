'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { buttonClass } from './styles';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel?: string;
  /** Lempar Error (mis. pesan dari respons `{ok:false}`) untuk menampilkannya di dialog. */
  onSubmit: (data: FormData) => void | Promise<void>;
  children: ReactNode;
};

/**
 * Dialog form berbasis `<dialog>` native (fokus, Esc, dan inert latar ditangani browser).
 * Pemanggil menutup dialog (`open=false`) setelah `onSubmit` sukses.
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  submitLabel = 'Simpan',
  onSubmit,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit(new FormData(e.currentTarget));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan. Coba lagi.');
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="form-dialog-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-md p-0 text-navy-800 backdrop:bg-navy-900/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <div>
          <h2 id="form-dialog-title" className="font-display text-2xl font-semibold">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-navy-400">{description}</p> : null}
        </div>

        {children}

        {error ? (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Batal
          </button>
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? 'Menyimpan…' : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
