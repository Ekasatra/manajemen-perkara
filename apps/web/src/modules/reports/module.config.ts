import type { Resource } from '@ekasatra/core';

export interface ModuleConfig {
  name: string;
  href: string;
  resource: Resource;
  order?: number;
  icon?: string;
  roles?: string[];
}

export const moduleConfig: ModuleConfig = {
  name: 'Laporan',
  href: '/reports',
  resource: 'reports',
  order: 80,
  icon: 'reports',
  roles: ['admin'],
};

