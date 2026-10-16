'use client';

import { useState } from 'react';
import { buttonClass } from '@/components/ui/styles';

/** Minta signed URL (berlaku 5 menit) lalu buka; berkas privat tidak punya URL tetap. */
export function DownloadLink({ endpoint, label }: { endpoint: string; label: string }) {
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    const res = await fetch(endpoint);
    const json = await res.json();
    if (json.ok) window.open(json.data.url, '_blank', 'noopener');
    else setError(json.error?.message ?? 'Gagal mengunduh');
  }

  return (
    <span>
      <button type="button" onClick={() => void open()} className={buttonClass.secondary}>
        {label}
      </button>
      {error ? <span role="alert" className="ml-2 text-sm text-danger-fg">{error}</span> : null}
    </span>
  );
}
