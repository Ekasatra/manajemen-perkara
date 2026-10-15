'use client';
/**
 * Unggah berkas langsung ke Storage lewat signed upload URL (Agent E).
 * Lewat server hanya untuk meminta URL; badan berkas tidak melewati fungsi Vercel.
 */
import { createClient } from '@supabase/supabase-js';

type Kind = 'surat-keluar' | 'surat-masuk' | 'templates';
const BUCKET: Record<Kind, string> = {
  'surat-keluar': 'surat',
  'surat-masuk': 'surat',
  templates: 'templates',
};

export async function uploadFile(kind: Kind, file: File) {
  const res = await fetch(`/api/v1/${kind}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, size: file.size }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Gagal menyiapkan unggahan');
  const { path, token, fileName } = json.data as { path: string; token: string; fileName: string };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.storage.from(BUCKET[kind]).uploadToSignedUrl(path, token, file);
  if (error) throw new Error('Unggah berkas gagal. Coba lagi.');
  return { path, fileName, size: file.size };
}

/** POST/PATCH JSON ke API; lempar Error berisi pesan galat bila `ok:false`. */
export async function callApi<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Permintaan gagal');
  return json.data as T;
}
