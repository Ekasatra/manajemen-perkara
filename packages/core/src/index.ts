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
// Cases (Modul D · D1–D7)
export {
  // D7 — kontrak baca untuk modul lain (E, F, G)
  listVisibleCaseIds,
  getCaseForUser,
  getCaseTeamMembers,
  // Baca dashboard (G1/G6)
  getCaseSummaryForDashboard,
  getUpcomingSchedulesForDashboard,
  getTenggat14HariCases,
  // Baca laporan (G2)
  listCasesForReport,
  listSchedulesForReport,
  getCaseProgressForReport,
  // Baca portal klien (G3)
  getClientCasesForPortal,
  getClientTimelineForPortal,
  getClientSchedulesForPortal,
  getClientDocumentsForPortal,
  verifyClientDocumentOwnership,
  // Baca cron (G5)
  getHearingRemindersForDate,
  getUpayaDeadlineReminders,
} from './cases/read';
// D3 — transisi status (fungsi murni)
export { applyStatusChange, addDays } from './cases/status';
export type { CaseStatusState, StatusChangeInput, StatusChangeResult } from './cases/status';
// D1/D2/D4 — service
export {
  createCase,
  listCases,
  requireVisibleCase,
  getCaseDetail,
  updateCase,
  deleteCase,
  changeCaseStatus,
  listMembers,
  addMember,
  removeMember,
  listTimeline,
  addTimelineEntry,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listDocuments,
  documentStoragePath,
  createDocumentRecord,
  updateDocument,
  deleteDocument,
  todayWib,
} from './cases/service';
