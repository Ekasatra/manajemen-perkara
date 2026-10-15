import type { ModuleConfig } from '@/modules/auth/module.config';

export const moduleConfig: ModuleConfig = {
  name: 'Perkara',
  href: '/cases',
  icon: 'cases',
  roles: ['admin', 'advokat', 'paralegal'],
};
