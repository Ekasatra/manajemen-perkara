'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { ZodType } from 'zod';
import { buttonClass } from './styles';
import { FormErrorsProvider, validateWithSchema } from './field';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel?: string;
  /** Tombol kirim berwarna bahaya, untuk konfirmasi hapus. */
  destructive?: boolean;
  /**
   * Skema zod bersama (packages/shared & packages/core) untuk validasi klien sebelum onSubmit.
   * Pesan galat tampil inline di bawah isian (lihat FieldError) dan fokus pindah ke isian
   * pertama yang salah. Tanpa skema, galat onSubmit tetap tampil role="alert".
   */
  schema?: ZodType;
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
  schema,
  onSubmit,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setError(null);

    // Validasi klien dengan skema zod yang sama seperti server; fokus ke isian pertama yang salah.
    if (schema) {
      const errors = validateWithSchema(schema, new FormData(form));
      setFieldErrors(errors);
      const firstName = Object.keys(errors)[0];
      if (firstName) {
        const target =
          form.querySelector<HTMLElement>(`[name="${firstName}"]`) ??
          form.querySelector<HTMLElement>(`#err-${CSS.escape(firstName)}`);
        target?.focus();
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setPending(false);
        return;
      }
    }

    try {
      await onSubmit(new FormData(form));
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
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 p-6">
        <div>
          <h2 id={titleId} className="text-base">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-navy-400">{description}</p> : null}
        </div>

        <FormErrorsProvider errors={fieldErrors}>{children}</FormErrorsProvider>

        {error ? (
          <p role="alert" className="text-sm text-danger-fg">
            {error}
          </p>
        ) : null}

        <div className="mt-1 flex flex-col-reverse gap-[12px] border-t border-navy-100 pt-5 sm:flex-row sm:justify-end">
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
