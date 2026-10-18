'use client';

import {
  Bell,
  BellOff,
  CornerDownRight,
  Gavel,
  PenTool,
  Undo2,
} from 'lucide-react';
import type { NotificationItem } from '@ekasatra/shared';

/** Ikon per jenis notifikasi; bentuk berbeda agar makna tidak hanya lewat warna. */
export const NOTIF_ICON = {
  approval: PenTool,
  disposisi: CornerDownRight,
  reject: Undo2,
  sidang: Gavel,
} as const;

/** Waktu relatif singkat, sama dengan panel dashboard. */
export function relTime(iso: string, now: Date = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso));
}

/**
 * Satu baris notifikasi. Memakai `<button>` (bukan tautan) karena klik harus
 * menandai dibaca lebih dulu, lalu berpindah halaman.
 */
export function NotificationRow({
  item,
  onSelect,
  disabled,
}: {
  item: NotificationItem;
  onSelect: (item: NotificationItem) => void;
  disabled?: boolean;
}) {
  const Icon = NOTIF_ICON[item.type] ?? Bell;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        disabled={disabled}
        className="flex w-full items-start gap-3 rounded-control p-2.5 text-left transition hover:bg-gold-50/60 focus-visible:bg-gold-50/60 disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700"
        >
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className={`line-clamp-2 flex-1 text-sm text-navy-800 ${
                item.read ? 'font-medium' : 'font-semibold'
              }`}
            >
              {item.title}
            </span>
            {item.read ? null : (
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-gold-500"
              />
            )}
          </span>
          <span className="line-clamp-1 text-xs text-navy-500">{item.description}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-navy-400">
            {relTime(item.date)}
            {item.read ? null : <span className="sr-only">, belum dibaca</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

export function NotificationSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2 p-2.5">
      <span className="sr-only">Memuat notifikasi…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-3 p-2.5">
          <span className="size-8 shrink-0 rounded-lg bg-navy-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-3/4 rounded bg-navy-100" />
            <span className="block h-3 w-full rounded bg-navy-100" />
            <span className="block h-2.5 w-16 rounded bg-navy-100" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function NotificationEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <BellOff aria-hidden="true" size={28} className="text-navy-300" />
      <p className="text-sm font-semibold text-navy-800">Tidak ada notifikasi baru</p>
      <p className="text-xs text-navy-400">
        Pemberitahuan surat dan jadwal sidang akan muncul di sini.
      </p>
    </div>
  );
}

export function NotificationError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-navy-800">Gagal memuat notifikasi</p>
      <p className="text-xs text-navy-400">Periksa koneksi Anda, lalu coba lagi.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 min-h-[44px] rounded-control border border-navy-200 bg-surface px-3 text-sm font-semibold text-navy-700 hover:border-navy-300 md:min-h-[40px]"
      >
        Coba lagi
      </button>
    </div>
  );
}
