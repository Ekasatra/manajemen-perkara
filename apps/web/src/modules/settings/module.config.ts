import type { ModuleConfig } from '@/modules/auth/module.config';

export const moduleConfig: ModuleConfig = {
  name: 'Pengaturan',
  href: '/settings',
  icon: 'settings',
  roles: ['admin', 'advokat', 'paralegal'],
};
