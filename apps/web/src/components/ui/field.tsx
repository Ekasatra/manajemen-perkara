import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ZodType } from 'zod';
import { labelClass } from './styles';

/**
 * Galat validasi per nama isian, dibagikan FormDialog ke seluruh anak form lewat konteks.
 * Kunci = `name` input / jalur pertama isian pada skema zod.
 */
const FormErrorsContext = createContext<Record<string, string>>({});

/** Ambil pesan galat untuk satu isian (undefined bila isian tidak bermasalah). */
export function useFieldError(name: string): string | undefined {
  return useContext(FormErrorsContext)[name];
}

/** Provider internal — hanya dipakai FormDialog. */
export function FormErrorsProvider({
  errors,
  children,
}: {
  errors: Record<string, string>;
  children: ReactNode;
}) {
  return <FormErrorsContext.Provider value={errors}>{children}</FormErrorsContext.Provider>;
}

/**
 * Label isian bersama. Isian wajib: bintang merah semantik (`aria-hidden`) plus teks pembaca
 * layar "(wajib diisi)"; isian opsional: teks kecil abu "(opsional)". Status wajib/opsional
 * mengikuti skema zod sumber kebenaran di packages/shared & packages/core — jangan menebak.
 */
export function Label({
  htmlFor,
  required = false,
  optional = false,
  children,
  className = '',
}: {
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`${labelClass} ${className}`}>
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-0.5 font-semibold text-danger-fg">
            *
          </span>
          <span className="sr-only"> (wajib diisi)</span>
        </>
      ) : null}
      {optional && !required ? (
        <span className="ml-1.5 text-[11px] font-normal text-navy-400">(opsional)</span>
      ) : null}
    </label>
  );
}

/** Teks bantuan di bawah isian; hubungkan ke input lewat aria-describedby. */
export function HelpText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs text-navy-400">
      {children}
    </p>
  );
}

/**
 * Galat validasi inline di bawah satu isian. Id-nya `err-<name>` dan harus dirujuk oleh
 * aria-describedby pada input; `role="alert"` agar diumumkan pembaca layar saat muncul.
 */
export function FieldError({ name }: { name: string }) {
  const message = useFieldError(name);
  if (!message) return null;
  return (
    <p
      id={`err-${name}`}
      role="alert"
      tabIndex={-1}
      className="mt-1 text-xs font-medium text-danger-fg"
    >
      {message}
    </p>
  );
}

/** Baris keterangan penanda pada form besar (taruh di atas isian pertama). */
export function RequiredNote() {
  return (
    <p className="text-xs text-navy-400">
      Tanda{' '}
      <span aria-hidden="true" className="font-semibold text-danger-fg">
        *
      </span>{' '}
      wajib diisi.
    </p>
  );
}

/**
 * Validasi klien memakai skema zod yang sama dengan server. Ubah FormData seperti payload yang
 * dikirim (sudah dipotong spasi; string kosong dianggap tidak diisi sehingga keputusan wajib /
 * opsional sepenuhnya milik skema), lalu kumpulkan pesan galat per nama isian.
 */
export function validateWithSchema(
  schema: ZodType,
  fd: FormData,
  transform?: (fd: FormData) => Record<string, unknown>,
): Record<string, string> {
  let data: Record<string, unknown>;
  if (transform) {
    data = transform(fd);
  } else {
    data = {};
    for (const [key, value] of fd.entries()) {
      const v = typeof value === 'string' ? value.trim() : value;
      if (v === '') continue;
      if (key in data) {
        const prev = data[key];
        data[key] = Array.isArray(prev) ? [...prev, v] : [prev, v];
      } else {
        data[key] = v;
      }
    }
  }
  const result = schema.safeParse(data);
  if (result.success) return {};
  const messages: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !messages[key]) messages[key] = issue.message;
  }
  return messages;
}
