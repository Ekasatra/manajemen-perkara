'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { buttonClass } from './styles';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel?: string;
  /** Tombol kirim berwarna bahaya, untuk konfirmasi hapus. */
  destructive?: boolean;
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
  destructive = false,
  onSubmit,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
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
      aria-labelledby={titleId}
      className="m-auto w-full rounded-card bg-surface p-0 text-navy-800 shadow-float backdrop:bg-navy-950/45 backdrop:backdrop-blur-sm sm:max-w-2xl max-h-[92vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
        <div>
          <h2 id={titleId} className="text-base">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-navy-400">{description}</p> : null}
        </div>

        {children}

        {error ? (
          <p role="alert" className="text-sm text-danger-fg">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className={destructive ? buttonClass.danger : buttonClass.primary}
          >
            {pending ? 'Menyimpan…' : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
