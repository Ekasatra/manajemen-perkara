/**
 * Tipe & utilitas lintas modul (milik Agent A).
 * PRD §5 — aturan bisnis umum.
 */

export const ROLES = ['admin', 'advokat', 'paralegal', 'viewer'] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
