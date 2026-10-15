/**
 * Konfigurasi modul auth (Agent C · C1).
 * Shell (Agent A) membaca module.config.ts dari semua modul untuk merakit sidebar.
 */
import type { Role } from '@ekasatra/shared';

export interface ModuleConfig {
  name: string;
  href: string;
  icon?: string;
  roles: Role[];
}

export const moduleConfig: ModuleConfig = {
  name: 'Auth',
  href: '/login',
  icon: 'lock',
  roles: ['admin', 'advokat', 'paralegal'],
};
