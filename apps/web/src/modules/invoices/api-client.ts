/** Panggilan JSON dari komponen klien ke /api/v1; galat `{ok:false}` dilempar sebagai Error berisi pesan. */
export async function callApi<T = unknown>(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as
    { ok: true; data: T } | { ok: false; error?: { message?: string } } | null;
  if (!json || !json.ok) {
    throw new Error((json && !json.ok && json.error?.message) || 'Permintaan gagal. Coba lagi.');
  }
  return json.data;
}

/** Nilai input rupiah → integer; kosong/pecahan/negatif → Error berbahasa Indonesia. */
export function parseRupiah(raw: FormDataEntryValue | null, label: string): number {
  const n = Number(String(raw ?? '').trim());
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${label} harus bilangan bulat rupiah`);
  return n;
}
