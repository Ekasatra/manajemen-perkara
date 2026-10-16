'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { formatRupiah } from '@/lib/format';
import { callApi } from '@/modules/invoices/api-client';

type Member = {
  userId: string;
  fullName: string;
  isMember: boolean;
  draftAmount: number | null;
  publishedAmount: number | null;
  status: 'Belum' | 'Dibayar';
};

const rp = formatRupiah;

/**
 * Editor honor per perkara (Admin). Draft disimpan terpisah; anggota baru melihat nilainya
 * setelah "Distribusikan". Validasi final (total ≤ dana) tetap di server.
 */
export function HonorEditor({
  caseId,
  fund,
  members,
}: {
  caseId: string;
  fund: number;
  members: Member[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      members.map((m) => [m.userId, m.draftAmount === null ? '' : String(m.draftAmount)]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const base = `/api/v1/honor-tim/cases/${caseId}`;

  const active = members.filter((m) => m.isMember);
  const total = useMemo(
    // Pratinjau hanya menjumlah bilangan bulat valid; simpan tetap memvalidasi dan memberi galat.
    () =>
      active.reduce((sum, m) => {
        const n = Number(values[m.userId]);
        return sum + (Number.isSafeInteger(n) ? n : 0);
      }, 0),
    [active, values],
  );
  const over = total > fund;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(label);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  function draftItems() {
    return active.flatMap((m) => {
      const raw = (values[m.userId] ?? '').trim();
      if (raw === '') return [];
      const amount = Number(raw);
      if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new Error(`Nilai honor ${m.fullName} harus bilangan bulat rupiah ≥ 0`);
      }
      return [{ userId: m.userId, amount }];
    });
  }

  const save = () =>
    run('Draft tersimpan', async () => {
      const items = draftItems();
      if (items.length === 0) throw new Error('Isi minimal satu nilai honor');
      await callApi(base, 'PUT', { items });
    });

  const publish = () => {
    if (!window.confirm('Distribusikan honor? Anggota akan dapat melihat nilainya.')) return;
    void run('Honor didistribusikan', async () => {
      const items = draftItems();
      if (items.length > 0) await callApi(base, 'PUT', { items });
      await callApi(`${base}/publish`, 'POST');
    });
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Honor per anggota tim</caption>
          <thead className="border-b border-navy-200 text-navy-600">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">
                Anggota
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Draft (Rp)
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Terdistribusi
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Status
              </th>
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-navy-100">
                <td className="py-2 pr-3">
                  {m.fullName}
                  {!m.isMember && (
                    <span className="ml-2 text-xs text-warning-fg">(bukan anggota tim lagi)</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <label className="sr-only" htmlFor={`h-${m.userId}`}>
                    Draft honor {m.fullName}
                  </label>
                  <input
                    id={`h-${m.userId}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    className={`${inputClass} max-w-40`}
                    value={values[m.userId] ?? ''}
                    disabled={!m.isMember || m.status === 'Dibayar'}
                    onChange={(e) => setValues((v) => ({ ...v, [m.userId]: e.target.value }))}
                  />
                </td>
                <td className="py-2 pr-3 text-right">
                  {m.publishedAmount === null ? '-' : rp(m.publishedAmount)}
                </td>
                <td className="py-2 pr-3">{m.publishedAmount === null ? 'Belum' : m.status}</td>
                <td className="py-2">
                  {m.publishedAmount !== null && (
                    <button
                      type="button"
                      className={buttonClass.secondary}
                      disabled={busy}
                      onClick={() =>
                        run(m.status === 'Dibayar' ? 'Status dibatalkan' : 'Ditandai Dibayar', () =>
                          callApi(
                            `${base}/members/${m.userId}/paid`,
                            m.status === 'Dibayar' ? 'DELETE' : 'POST',
                          ),
                        )
                      }
                    >
                      {m.status === 'Dibayar' ? 'Batalkan Dibayar' : 'Tandai Dibayar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className={`mt-4 text-sm ${over ? 'font-medium text-danger-fg' : 'text-navy-700'}`}
        aria-live="polite"
      >
        Total draft {rp(total)} dari dana distribusi {rp(fund)}
        {over ? `, melebihi ${rp(total - fund)}` : `, sisa ${rp(fund - total)}`}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={buttonClass.secondary} disabled={busy} onClick={save}>
          Simpan Draft
        </button>
        <button
          type="button"
          className={buttonClass.primary}
          disabled={busy || over}
          onClick={publish}
        >
          Distribusikan
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-fg">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="mt-3 text-sm text-success-fg">
          {notice}
        </p>
      )}
    </div>
  );
}
