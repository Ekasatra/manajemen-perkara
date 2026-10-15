import type { ModuleConfig } from '@/modules/auth/module.config';

export const moduleConfig: ModuleConfig = {
  name: 'Audit Log',
  href: '/audit',
  icon: 'audit',
  roles: ['admin'],
};
