'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Brand } from '@/components/ui/brand';
import { NAV_ICONS } from './nav-icons';
import type { NavIconName } from './nav-icons';
import { ToastProvider } from './toast';

/**
 * Satu entri sidebar. Daftar entri dirakit di layout lalu dikelompokkan berdasarkan `group`
 * (entri berurutan dengan group sama membentuk satu kelompok; tanpa group = di atas).
 */
export type NavItem = { label: string; href: string; icon?: NavIconName; group?: string };

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

type NavSection = { group: string | null; items: NavItem[] };

function toSections(nav: NavItem[]): NavSection[] {
  const sections: NavSection[] = [];
  for (const item of nav) {
    const group = item.group ?? null;
    const last = sections[sections.length - 1];
    if (last && last.group === group) last.items.push(item);
    else sections.push({ group, items: [item] });
  }
  return sections;
}

const LOGOUT_PATH = '/api/v1/auth/logout';

export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function logout() {
    await fetch(LOGOUT_PATH, { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const sections = toSections(nav);
  // Label disembunyikan hanya pada sidebar desktop yang dilipat; drawer mobile selalu penuh.
  const hideLabel = collapsed ? 'md:sr-only' : '';

  return (
    <ToastProvider>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-white focus:px-3 focus:py-2"
      >
        Lewati ke konten
      </a>

      <header className="flex items-center gap-3 border-b border-navy-200 bg-white px-4 py-2 md:hidden print:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-navy-300 px-3 text-sm font-medium text-navy-700"
        >
          <Menu aria-hidden="true" size={18} />
          Menu
        </button>
        <Brand variant="compact" className="text-navy-700" />
      </header>

      {open ? (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 bg-navy-900/50 md:hidden"
        />
      ) : null}

      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-navy-700 text-navy-100 transition-transform md:translate-x-0 print:hidden ${
          collapsed ? 'md:w-16' : ''
        } ${open ? 'translate-x-0' : 'max-md:invisible max-md:-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <Brand className={`text-gold-300 ${collapsed ? 'md:sr-only' : ''}`} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-sm text-navy-200 hover:text-white focus-visible:outline-gold-300 md:hidden"
          >
            <X aria-hidden="true" size={18} />
            Tutup
          </button>
        </div>

        <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.map((section, i) => (
            <div key={section.group ?? `top-${i}`} className={i > 0 ? 'mt-4' : ''}>
              {section.group ? (
                <p className={`px-3 pb-1 text-xs font-semibold text-navy-200 ${hideLabel}`}>
                  {section.group}
                </p>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon ? NAV_ICONS[item.icon] : null;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                        className={`flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm focus-visible:outline-gold-300 md:min-h-9 ${
                          active
                            ? 'bg-navy-600 font-medium text-gold-300'
                            : 'text-navy-100 hover:bg-navy-800 hover:text-white'
                        }`}
                      >
                        {Icon ? <Icon aria-hidden="true" size={18} className="shrink-0" /> : null}
                        <span className={hideLabel}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-navy-600 px-3 py-3">
          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm text-navy-100 hover:bg-navy-800 hover:text-white focus-visible:outline-gold-300 md:min-h-9"
          >
            <LogOut aria-hidden="true" size={18} className="shrink-0" />
            <span className={hideLabel}>Keluar</span>
          </button>
          <button
            type="button"
            aria-pressed={collapsed}
            onClick={() => setCollapsed((v) => !v)}
            className="hidden min-h-9 items-center gap-3 rounded-control px-3 py-2 text-sm text-navy-100 hover:bg-navy-800 hover:text-white focus-visible:outline-gold-300 md:flex"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" size={18} className="shrink-0" />
            ) : (
              <PanelLeftClose aria-hidden="true" size={18} className="shrink-0" />
            )}
            <span className={hideLabel}>Ciutkan menu</span>
          </button>
        </div>
      </aside>

      <main
        id="konten"
        className={`min-h-screen p-4 md:p-8 print:m-0 print:p-0 ${collapsed ? 'md:ml-16' : 'md:ml-64'}`}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </ToastProvider>
  );
}
