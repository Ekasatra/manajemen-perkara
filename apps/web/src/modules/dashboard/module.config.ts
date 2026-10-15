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
  name: 'Dashboard',
  href: '/',
  resource: 'cases',
  order: 1,
  icon: 'dashboard',
  roles: ['admin', 'advokat', 'paralegal'],
};

