import type { ModuleConfig } from '@/modules/auth/module.config';

export const moduleConfig: ModuleConfig = {
  name: 'Data Advokat',
  href: '/advocates',
  icon: 'advocates',
  roles: ['admin', 'advokat', 'paralegal'],
};
