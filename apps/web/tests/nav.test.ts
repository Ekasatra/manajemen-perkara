import { describe, expect, it } from 'vitest';
import { RESOURCES } from '@ekasatra/core';
import { HOME, buildNav } from '@/shell/nav';
import type { ModuleConfig } from '@/shell/nav';
import { MODULES } from '@/shell/registry';

const fake: ModuleConfig[] = [
  { name: 'Perkara', href: '/cases', resource: 'cases', order: 10 },
  { name: 'Klien', href: '/clients', resource: 'clients', order: 20 },
  { name: 'Audit Log', href: '/audit', resource: 'audit_log', order: 90 },
  { name: 'Template', href: '/templates', resource: 'templates' },
  { name: 'Advokat', href: '/advocates', resource: 'advocates' },
];

const labels = (role: string) => buildNav(fake, { role }).map((i) => i.label);

describe('buildNav', () => {
  it('admin melihat semua menu, berurutan: order lalu nama', () => {
    expect(labels('admin')).toEqual([
      'Beranda',
      'Perkara',
      'Klien',
      'Audit Log',
      'Advokat',
      'Template',
    ]);
  });

  it('menu disaring lewat can(R): klien & audit log hanya untuk admin', () => {
    expect(labels('advokat')).toEqual(['Beranda', 'Perkara', 'Advokat', 'Template']);
    expect(labels('paralegal')).toEqual(['Beranda', 'Perkara', 'Advokat', 'Template']);
  });

  it('role tak dikenal diperlakukan sebagai viewer (least privilege)', () => {
    expect(labels('Admin')).toContain('Audit Log'); // role DB berkapital dinormalkan
    expect(labels('hacker')).toEqual(['Beranda', 'Perkara', 'Advokat', 'Template']);
  });

  it('Beranda selalu ada dan tidak mengubah daftar input', () => {
    const before = [...fake];
    expect(buildNav([], { role: 'viewer' })).toEqual([HOME]);
    buildNav(fake, { role: 'admin' });
    expect(fake).toEqual(before);
  });
});

describe('registry', () => {
  it('semua entri valid: href unik, berawalan "/", resource dikenal kernel', () => {
    const hrefs = MODULES.map((m) => m.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const m of MODULES) {
      expect(m.href.startsWith('/')).toBe(true);
      expect(RESOURCES).toContain(m.resource);
    }
  });
});
