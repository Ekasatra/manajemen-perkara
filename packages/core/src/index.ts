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

// Settings Readers
export { getSetting, getAllSettings } from './settings/read';

// Users Readers
export {
  getUserNotificationProfile,
  getMultipleUserNotificationProfiles,
} from './users/read';
export type { UserNotificationProfile } from './users/read';

// Notifications (Agent G · G4)
export {
  notify,
  notifyMany,
  notifyGeneric,
  renderEmailTemplate,
  baseEmailLayout,
  formatRupiah,
  escapeHtml,
  sendEmailViaResend,
  setEmailTransport,
} from './notifications';
export type {
  GenericNotifyInput,
  EmailContent,
  SendEmailPayload,
  SendEmailResult,
  EmailTransport,
} from './notifications';

// Cases (Modul D · D1–D7)
export {
  // D7 — kontrak baca untuk modul lain (E, F, G)
  listVisibleCaseIds,
  getCaseForUser,
  getCaseTeamMembers,
  // Baca dashboard (G1/G6)
  getCaseSummaryForDashboard,
  getUpcomingSchedulesForDashboard,
  listSchedulesInRange,
  listDocumentCatalog,
  listCasesDetailed,
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

// Surat Readers (Modul E)
export {
  getSuratSummaryForDashboard,
  getSuratTrend6Bulan,
  getApprovalMenungguSaya,
  getSuratPersonalNotifications,
  listSuratMasukForReport,
  listSuratKeluarForReport,
  getClientSuratMasukForPortal,
} from './surat/read';

// Finance Readers (Modul F)
export {
  listInvoicesForReport,
  outstandingSummary,
  getTenggat14HariInvoices,
  listHonorariumForReport,
  getClientInvoicesForPortal,
} from './finance/read';
export type { InvoiceReportFilter, InvoiceReportItem } from './finance/read';

// Clients Readers (Modul C)
export {
  getClientByPortalToken,
  getNewClientsCountThisMonth,
  listClientsForReportOptions,
} from './clients/read';

// Audit Readers (Modul C)
export {
  getRecentActivitiesForDashboard,
  isCronRemindersAlreadyRunToday,
  recordCronRemindersRun,
} from './audit/read';

// Dashboard (Agent G · G1)
export { getDashboardData } from './dashboard';
export type { DashboardUser } from './dashboard';
export type { ScheduleCalendarItem, DocumentCatalogItem, CaseListItem } from './cases/read';

// Reports (Agent G · G2)
export {
  getCasesReport,
  getSuratMasukReport,
  getSuratKeluarReport,
  getHonorariumReport,
  getSchedulesReport,
  getCaseProgress,
  exportToCsv,
  exportReportToPrintableHtml,
} from './reports';

// Portal Klien (Agent G · G3)
export {
  validateClientPortalAccess,
  getPortalData,
  getVerifiedClientDocument,
} from './portal';

// Cron Reminders (Agent G · G5)
export { runDailyRemindersCron, getTodayWibDate } from './cron';
export type { CronExecutionResult } from './cron';


