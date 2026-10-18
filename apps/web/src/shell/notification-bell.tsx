'use client';

/**
 * Lonceng notifikasi (R8).
 *
 * - Tombol dengan `aria-haspopup`/`aria-expanded` membuka panel, bukan berpindah halaman.
 * - Panel: maks 10 notifikasi terbaru, belum dibaca ditandai titik + teks tebal.
 * - Tutup dengan Esc, klik luar, atau memilih item; fokus kembali ke tombol lonceng.
 * - Di ponsel panel menjadi bottom sheet selebar layar.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { NotificationItem } from '@ekasatra/shared';
import { useNotifications } from './use-notifications';
import { badgeLabel, notificationAriaLabel, unreadSummary } from './notification-format';
import {
  NotificationEmpty,
  NotificationError,
  NotificationRow,
  NotificationSkeleton,
} from './notification-ui';

const PANEL_LIMIT = 10;

export function NotificationBell({
  feed,
}: {
  /** Diberikan bila induk sudah memakai `useNotifications` (satu fetch untuk lonceng + sidebar). */
  feed?: ReturnType<typeof useNotifications>;
}) {
  const own = useNotifications();
  const { status, busy, markRead, markAll, reload, items, unreadCount } = feed ?? own;

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Esc + klik luar. Listener dipasang hanya saat panel terbuka.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  // Pindahkan fokus ke panel saat dibuka agar pembaca layar langsung membacanya.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  function onSelect(item: NotificationItem) {
    close(false);
    // Tandai dibaca tanpa menunggu navigasi; `keepalive` menjaga request tetap jalan.
    if (!item.read) void markRead(item.id);
    router.push(item.link);
    router.refresh();
  }

  const label = notificationAriaLabel(unreadCount);
  const badge = badgeLabel(unreadCount);
  const preview = items.slice(0, PANEL_LIMIT);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={label}
        onClick={() => (open ? close() : setOpen(true))}
        className="relative inline-flex size-11 items-center justify-center rounded-control text-navy-500 transition hover:bg-navy-100 hover:text-navy-800"
      >
        <Bell aria-hidden="true" size={18} />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white"
          >
            {badge}
          </span>
        ) : null}      </button>

      {open ? (
        <>
          {/* Latar gelap hanya di ponsel; di desktop panel cukup menutup lewat klik luar. */}
          <div
            aria-hidden="true"
            onClick={() => close(false)}
            className="fixed inset-0 z-40 bg-navy-950/40 sm:hidden"
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Notifikasi"
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-hidden rounded-t-card border border-navy-100 bg-surface shadow-float outline-none sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] sm:rounded-card"
          >
            <div className="flex items-center justify-between gap-3 border-b border-navy-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy-800">Notifikasi</p>
                <p className="text-xs text-navy-400">
                  {unreadSummary(unreadCount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void markAll()}
                disabled={busy || unreadCount === 0}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control px-2 text-xs font-semibold text-navy-600 transition hover:bg-navy-100 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[40px]"
              >
                <CheckCheck aria-hidden="true" size={15} />
                Tandai semua dibaca
              </button>
            </div>

            <div className="max-h-[calc(80vh-9.5rem)] overflow-y-auto sm:max-h-[360px]">
              {status === 'loading' ? (
                <NotificationSkeleton />
              ) : status === 'error' ? (
                <NotificationError onRetry={reload} />
              ) : preview.length === 0 ? (
                <NotificationEmpty />
              ) : (
                <ul className="flex flex-col gap-0.5 p-1.5">
                  {preview.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onSelect={onSelect}
                      disabled={busy && !item.read}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-navy-50 p-1.5">
              <Link
                href="/notifikasi"
                onClick={() => close(false)}
                className="flex min-h-[44px] items-center justify-center rounded-control text-xs font-semibold text-navy-600 transition hover:bg-navy-100 md:min-h-[40px]"
              >
                Lihat semua notifikasi
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
