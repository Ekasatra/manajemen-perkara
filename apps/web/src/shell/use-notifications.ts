'use client';

/**
 * State notifikasi sisi klien (R8): satu hook dipakai lonceng dan halaman
 * "Lihat semua" supaya keduanya membaca endpoint dan bentuk data yang sama.
 *
 * Tanpa dependensi baru: polling ringan 60 detik + refetch saat tab kembali fokus.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationFeed, NotificationItem } from '@ekasatra/shared';

const ENDPOINT = '/api/v1/notifications';
const POLL_MS = 60_000;

export type NotificationStatus = 'loading' | 'ready' | 'error';

function withoutItem(feed: NotificationFeed, id: string): NotificationFeed {
  const target = feed.notifications.find((n) => n.id === id);
  if (!target || target.read) return feed;
  return {
    ...feed,
    notifications: feed.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    unreadCount: Math.max(0, feed.unreadCount - 1),
  };
}

export function useNotifications() {
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [status, setStatus] = useState<NotificationStatus>('loading');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Tidak ada setState sinkron di sini: status awal sudah `loading`, dan
  // pemanggilan dari effect hanya boleh memperbarui state setelah await.
  const load = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error?.message ?? 'Gagal memuat notifikasi');
      }
      if (!alive.current) return;
      setFeed(body.data as NotificationFeed);
      setStatus('ready');
    } catch {
      if (!alive.current) return;
      // Data lama tetap ditampilkan; hanya tampilkan galat bila belum ada data.
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muat perdana setelah mount; setState hanya terjadi setelah await
    void load();

    const timer = setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistis: badge turun segera, lalu disinkronkan ke server.
      setFeed((prev) => (prev ? withoutItem(prev, id) : prev));
      setBusy(true);
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
          keepalive: true,
        });
        const body = await res.json();
        if (!res.ok || !body?.ok) throw new Error(body?.error?.message ?? 'Gagal');
        if (alive.current) setFeed(body.data as NotificationFeed);
      } catch {
        void load();
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [load],
  );

  const markAll = useCallback(async () => {
    setFeed((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
          }
        : prev,
    );
    setBusy(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) throw new Error(body?.error?.message ?? 'Gagal');
      if (alive.current) setFeed(body.data as NotificationFeed);
    } catch {
      void load();
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [load]);

  return {
    feed,
    status,
    busy,
    reload: load,
    markRead,
    markAll,
    unreadCount: feed?.unreadCount ?? 0,
    approvalCount: feed?.approvalCount ?? 0,
    items: (feed?.notifications ?? []) as NotificationItem[],
  };
}
