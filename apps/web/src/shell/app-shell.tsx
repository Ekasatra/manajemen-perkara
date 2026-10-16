'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Calendar, CircleUser, LogOut, Menu, X } from 'lucide-react';
import { APP_NAME, Brand } from '@/components/ui/brand';
import { avatarColor } from '@/lib/avatar';
import { NAV_ICONS } from './nav-icons';
import type { NavIconName } from './nav-icons';
import { ThemeToggle } from './theme-toggle';
import { ToastProvider } from './toast';

/**
 * Satu entri sidebar. Daftar entri dirakit di layout lalu dikelompokkan berdasarkan `group`
 * (entri berurutan dengan group sama membentuk satu kelompok; tanpa group = di atas).
 * `badge: 'approvals'` menampilkan jumlah surat yang menunggu persetujuan pengguna.
 */
export type NavItem = {
  label: string;
  href: string;
  icon?: NavIconName;
  group?: string;
  badge?: 'approvals';
};

/** Identitas pengguna yang sedang masuk, dibaca dari sesi di server (bukan karangan antarmuka). */
export type Viewer = { name: string; email: string; roleLabel: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')
  ).toUpperCase();
}

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
const NOTIF_PATH = '/api/v1/notifications?ringkas=1';
const TODAY_FORMAT = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

/** Jumlah pemberitahuan dan surat menunggu persetujuan; dimuat setelah halaman tampil agar tidak menahan render. */
function useShellCounts() {
  const [counts, setCounts] = useState({ notif: 0, approvals: 0 });
  useEffect(() => {
    let cancelled = false;
    fetch(NOTIF_PATH)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled || !body?.ok) return;
        setCounts({
          notif: Array.isArray(body.data?.notifications) ? body.data.notifications.length : 0,
          approvals: Number(body.data?.approvalCount ?? 0),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return counts;
}

export function AppShell({
  nav,
  viewer,
  children,
}: {
  nav: NavItem[];
  viewer: Viewer | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const counts = useShellCounts();

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
  const current = nav
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const notifLabel = counts.notif > 9 ? '9+' : String(counts.notif);

  const bell = (
    <Link
      href="/#pemberitahuan"
      aria-label={counts.notif ? `Pemberitahuan, ${counts.notif} baru` : 'Pemberitahuan'}
      className="relative inline-flex size-10 items-center justify-center rounded-control text-navy-500 transition hover:bg-navy-100 hover:text-navy-800 md:size-9"
    >
      <Bell aria-hidden="true" size={18} />
      {counts.notif ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white">
          {notifLabel}
        </span>
      ) : null}
    </Link>
  );

  return (
    <ToastProvider>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2"
      >
        Lewati ke konten
      </a>

      {open ? (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden"
        />
      ) : null}

      <aside
        id="sidebar"
        className={`sidebar-surface inset-y-0 left-0 z-40 flex w-[268px] flex-col text-white transition-transform duration-200 lg:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full'
        }`}
      >
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 pb-5 pt-6">
          <Brand light />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="inline-flex size-10 items-center justify-center rounded-control text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-gold-300 lg:hidden"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <nav aria-label="Menu utama" className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, i) => (
            <div key={section.group ?? `top-${i}`} className={i > 0 ? 'mt-5' : ''}>
              {section.group ? (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  {section.group}
                </p>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon ? NAV_ICONS[item.icon] : null;
                  const badge = item.badge === 'approvals' ? counts.approvals : 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                        className={`flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-sm transition focus-visible:outline-gold-300 ${
                          active
                            ? 'bg-linear-to-r from-gold-500/90 to-gold-600/80 text-white shadow-lg'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {Icon ? <Icon aria-hidden="true" size={18} className="shrink-0" /> : null}
                        <span className="flex-1">{item.label}</span>
                        {badge ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-white">
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {viewer ? (
          <div className="relative z-10 border-t border-white/10 p-3">
            <div className="flex items-center gap-3 rounded-control bg-white/10 p-3 backdrop-blur">
              <span
                aria-hidden="true"
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${avatarColor(viewer.name)}`}
              >
                {initials(viewer.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{viewer.name}</p>
                <p className="text-[11px] text-gold-300">{viewer.roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Keluar"
                aria-label="Keluar"
                className="inline-flex size-9 items-center justify-center rounded-control text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-gold-300"
              >
                <LogOut aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="min-w-0 lg:pl-[268px] print:pl-0">
        <header className="sticky top-0 z-20 print:hidden">
          <div className="card-surface mx-3 mt-3 flex items-center gap-3 px-3 py-2.5 sm:mx-6 sm:px-4">
            <button
              type="button"
              aria-expanded={open}
              aria-controls="sidebar"
              aria-label="Buka menu"
              onClick={() => setOpen(true)}
              className="inline-flex size-10 items-center justify-center rounded-control text-navy-500 hover:bg-navy-100 lg:hidden"
            >
              <Menu aria-hidden="true" size={18} />
            </button>
            <p className="min-w-0 flex-1 truncate text-xs text-navy-400">
              <span className="font-semibold text-navy-800">{APP_NAME.toUpperCase()}</span>
              <span aria-hidden="true"> / </span>
              {current?.label ?? ''}
            </p>
            <span className="hidden items-center gap-2 rounded-control bg-navy-50 px-2 py-1 text-xs text-navy-500 md:flex">
              <Calendar aria-hidden="true" size={15} />
              {TODAY_FORMAT.format(new Date())}
            </span>
            <ThemeToggle />
            {bell}
            <Link
              href="/profil"
              aria-label="Profil Saya"
              title="Profil Saya"
              className="inline-flex size-10 items-center justify-center rounded-control text-navy-500 transition hover:bg-navy-100 hover:text-navy-800 md:size-9"
            >
              <CircleUser aria-hidden="true" size={18} />
            </Link>
          </div>
        </header>
        <main id="konten" className="min-h-screen p-3 pb-16 sm:p-6 sm:pb-16 print:m-0 print:p-0">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
