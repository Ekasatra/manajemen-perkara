'use client';

/**
 * Halaman "Lihat semua notifikasi" (R8).
 * Memakai hook yang sama dengan lonceng agar hitungan dan daftar konsisten.
 */
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import type { NotificationItem } from '@ekasatra/shared';
import { PageHeader } from '@/components/ui/page-header';
import {
  NotificationEmpty,
  NotificationError,
  NotificationRow,
  NotificationSkeleton,
} from '@/shell/notification-ui';
import { useNotifications } from '@/shell/use-notifications';

export function NotificationListPage() {
  const router = useRouter();
  const { status, busy, items, unreadCount, markRead, markAll, reload } = useNotifications();

  function onSelect(item: NotificationItem) {
    if (!item.read) void markRead(item.id);
    router.push(item.link);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Notifikasi"
        description={
          unreadCount > 0
            ? `${unreadCount} notifikasi belum dibaca.`
            : 'Semua notifikasi sudah dibaca.'
        }
        actions={
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={busy || unreadCount === 0}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-navy-200 bg-surface px-4 text-sm font-semibold text-navy-700 transition hover:border-navy-300 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[40px]"
          >
            <CheckCheck aria-hidden="true" size={16} />
            Tandai semua dibaca
          </button>
        }
      />

      <div className="card-surface overflow-hidden">
        {status === 'loading' ? (
          <NotificationSkeleton rows={6} />
        ) : status === 'error' ? (
          <NotificationError onRetry={reload} />
        ) : items.length === 0 ? (
          <NotificationEmpty />
        ) : (
          <ul className="flex flex-col gap-0.5 p-2">
            {items.map((item) => (
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
    </div>
  );
}
