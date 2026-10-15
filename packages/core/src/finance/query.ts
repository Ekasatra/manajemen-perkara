/** Helper parsing query string & parameter path untuk route keuangan (Agent F). */
import { validationError } from '@ekasatra/shared';
import { z } from 'zod';

export function parseQuery<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  const parsed = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw validationError(detail || 'Query tidak valid');
  }
  return parsed.data;
}

/** Validasi id path sebagai UUID agar tidak menjadi galat 500 dari Postgres. */
export function uuidParam(value: string, label = 'ID'): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw validationError(`${label} tidak valid`);
  return parsed.data;
}
