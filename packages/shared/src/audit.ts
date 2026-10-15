/**
 * Skema validasi modul audit (Agent C · C7).
 * PRD §5.14: filter by user, modul, aksi, entitas, rentang tanggal.
 */
import { z } from 'zod';

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  userId: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;