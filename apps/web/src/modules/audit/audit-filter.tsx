'use client';

import { useRouter } from 'next/navigation';
import type { SearchParams } from '@/lib/pagination';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

const MODULES = ['', 'auth', 'users', 'clients', 'opponents', 'advocates', 'settings', 'cases', 'surat-masuk', 'surat-keluar', 'invoices', 'honor-tim'];
const ACTIONS = ['', 'create', 'update', 'delete', 'login', 'login_failed', 'setup_admin', 'reset_password', 'regenerate_token'];

export function AuditFilter({ initialParams }: { initialParams: SearchParams }) {
  const router = useRouter();

  function applyFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (value) params.set(key, String(value));
    }
    router.push(`/audit?${params.toString()}`);
  }

  const getVal = (key: string): string =>
    typeof initialParams[key] === 'string' ? String(initialParams[key]) : '';

  return (
    <form onSubmit={applyFilter} className="flex flex-wrap items-end gap-3 rounded-md border border-navy-200 bg-white p-4">
      <div>
        <label htmlFor="f-module" className={labelClass}>Modul</label>
        <select id="f-module" name="module" defaultValue={getVal('module')} className={inputClass}>
          {MODULES.map((m) => (
            <option key={m} value={m}>{m || 'Semua'}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-action" className={labelClass}>Aksi</label>
        <select id="f-action" name="action" defaultValue={getVal('action')} className={inputClass}>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a || 'Semua'}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-from" className={labelClass}>Dari Tanggal</label>
        <input id="f-from" name="fromDate" type="date" defaultValue={getVal('fromDate')} className={inputClass} />
      </div>
      <div>
        <label htmlFor="f-to" className={labelClass}>Sampai Tanggal</label>
        <input id="f-to" name="toDate" type="date" defaultValue={getVal('toDate')} className={inputClass} />
      </div>
      <button type="submit" className={buttonClass.primary}>Filter</button>
    </form>
  );
}
