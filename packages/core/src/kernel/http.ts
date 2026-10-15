/**
 * Kernel HTTP (milik Agent A) — kontrak respons seragam `{ok, data|error}`.
 * Semua route handler Next.js dipanggil lewat `runRoute()` agar AppError
 * selalu menjadi JSON berstatus tepat dan error tak terduga tidak bocor.
 */
import { badRequest, isAppError, internalError, validationError } from '@ekasatra/shared';
import type { ErrorCode } from '@ekasatra/shared';
import type { z } from 'zod';

export const CODE_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
};

export type AppOk<T> = { ok: true; data: T };
export type AppErr = { ok: false; error: { code: ErrorCode; message: string } };
export type AppResult<T> = AppOk<T> | AppErr;

export function ok<T>(data: T): AppOk<T> {
  return { ok: true, data };
}

/** Ubah error apa pun menjadi AppError (error tak terduga → INTERNAL_ERROR 500, di-log). */
export function toAppError(err: unknown): ReturnType<typeof internalError> {
  if (isAppError(err)) return err;
  console.error('[api] error tak terduga:', err);
  return internalError();
}

export function toErrPayload(err: unknown): AppErr {
  const appError = toAppError(err);
  return { ok: false, error: { code: appError.code, message: appError.message } };
}

export function toResponse(result: AppResult<unknown>, status = 200): Response {
  if (result.ok) return Response.json(result, { status });
  return Response.json(result, { status: CODE_STATUS[result.error.code] });
}

/**
 * Pembungkus route handler Next.js:
 * - hasil `ok(data)` → 200 JSON `{ok:true,data}`
 * - hasil/lemparan AppError → JSON `{ok:false,error}` dengan status tepat
 * - error lain → 500 tanpa detail internal
 */
export async function runRoute(fn: () => Promise<AppResult<unknown>>): Promise<Response> {
  try {
    const result = await fn();
    return toResponse(result);
  } catch (err) {
    return Response.json(toErrPayload(err), { status: toAppError(err).status });
  }
}

/** Parse & validasi body JSON dengan zod; gagal → VALIDATION_ERROR / BAD_REQUEST. */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Body harus JSON valid');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw validationError(detail || 'Body tidak valid');
  }
  return parsed.data;
}
