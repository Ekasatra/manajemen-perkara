/**
 * Kontrak error aplikasi (milik Agent A).
 * Dipakai kernel di @ekasatra/core untuk respons seragam `{ok, data|error}`.
 */

export const ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function badRequest(message: string): AppError {
  return new AppError('BAD_REQUEST', message, 400);
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError('UNAUTHORIZED', message, 401);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError('FORBIDDEN', message, 403);
}

export function notFound(message = 'Not found'): AppError {
  return new AppError('NOT_FOUND', message, 404);
}

export function conflict(message: string): AppError {
  return new AppError('CONFLICT', message, 409);
}

export function validationError(message: string): AppError {
  return new AppError('VALIDATION_ERROR', message, 422);
}

export function internalError(message = 'Internal error'): AppError {
  return new AppError('INTERNAL_ERROR', message, 500);
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
