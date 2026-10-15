'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastProvider } from './toast';

/** Satu entri sidebar. Daftar entri dirakit pemuat `module.config.ts` (A4) lalu difilter per role. */
export type NavItem = { label: string; href: string };

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <ToastProvider>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Lewati ke konten
      </a>

      <header className="flex items-center gap-3 border-b border-navy-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          aria-label="Buka menu"
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(true)}
          className="rounded-md border border-navy-200 px-3 py-1.5 text-navy-700 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          Menu
        </button>
        <span className="font-display text-xl font-semibold text-navy-700">eKaSatra</span>
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
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-navy-700 text-navy-100 transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : 'max-md:invisible max-md:-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <span className="font-display text-2xl font-semibold text-gold-300">eKaSatra</span>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-navy-200 hover:text-white focus-visible:outline-2 focus-visible:outline-gold-300 md:hidden"
          >
            ×
          </button>
        </div>
        <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-gold-300 ${
                      active
                        ? 'bg-navy-600 font-medium text-gold-300'
                        : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main id="konten" className="min-h-screen p-4 md:ml-64 md:p-8">
        {children}
      </main>
    </ToastProvider>
  );
}
