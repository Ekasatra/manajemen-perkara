/**
 * Kernel & logika bisnis modul (Agent A memegang `src/kernel/`).
 * A2: AppError handling, respons seragam `{ok,data|error}`, `requireUser()`,
 * `can()` + policy PRD §4, `withTx`, `nextCounter`, `logActivity`.
 */
export { AppError, isAppError } from '@ekasatra/shared';

// Kernel — HTTP
export {
  CODE_STATUS,
  ok,
  toAppError,
  toErrPayload,
  toResponse,
  runRoute,
  parseBody,
} from './kernel/http';
export type { AppOk, AppErr, AppResult } from './kernel/http';

// Kernel — Auth
export { requireUser } from './kernel/auth';
export type { AuthContext } from './kernel/auth';

// Kernel — Policy (PRD §4)
export {
  ACTIONS,
  RESOURCES,
  POLICY,
  can,
  ensureCan,
  canViewKas,
  normalizeRole,
} from './kernel/policy';
export type { Action, Resource, PolicyUser } from './kernel/policy';

// Kernel — DB helpers
export { withTx, nextCounter } from './kernel/db-helpers';
export type { DbExecutor } from './kernel/db-helpers';

// Kernel — Activity log
export { logActivity } from './kernel/activity';
export type { ActivityLogInput } from './kernel/activity';
