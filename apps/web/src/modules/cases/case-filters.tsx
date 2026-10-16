'use client';

import { Search } from 'lucide-react';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { CASE_TYPES } from './constants';

type Props = {
  q: string;
  status: string;
  caseType: string;
  advokat: string;
  statuses: readonly string[];
  advocates: { id: string; name: string }[];
};

/** Filter daftar perkara. Pilihan select langsung menerapkan filter; pencarian lewat Enter atau tombol. */
export function CaseFilters({ q, status, caseType, advokat, statuses, advocates }: Props) {
  const apply = (e: { currentTarget: HTMLSelectElement }) => e.currentTarget.form?.requestSubmit();
  return (
    <form method="get" role="search" className="flex flex-wrap items-center gap-2 p-4">
      <div className="relative min-w-[220px] flex-1">
        <label htmlFor="pk-q" className="sr-only">
          Cari perkara
        </label>
        <Search
          aria-hidden="true"
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300"
        />
        <input
          id="pk-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nomor, judul, pengadilan, klien..."
          className={`${inputClass} pl-10`}
        />
      </div>
      <label className="sr-only" htmlFor="pk-status">
        Status
      </label>
      <select
        id="pk-status"
        name="status"
        defaultValue={status}
        onChange={apply}
        className={`${inputClass} w-auto!`}
      >
        <option value="">Semua status</option>
        {statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="pk-type">
        Jenis perkara
      </label>
      <select
        id="pk-type"
        name="jenis"
        defaultValue={caseType}
        onChange={apply}
        className={`${inputClass} w-auto!`}
      >
        <option value="">Semua jenis</option>
        {CASE_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="pk-adv">
        Advokat
      </label>
      <select
        id="pk-adv"
        name="advokat"
        defaultValue={advokat}
        onChange={apply}
        className={`${inputClass} w-auto!`}
      >
        <option value="">Semua advokat</option>
        {advocates.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <button type="submit" className={buttonClass.secondary}>
        Cari
      </button>
    </form>
  );
}
