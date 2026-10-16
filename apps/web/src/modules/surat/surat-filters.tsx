'use client';

import { Search } from 'lucide-react';
import { buttonClass, inputClass } from '@/components/ui/styles';

type Select = {
  name: string;
  label: string;
  all: string;
  value: string;
  options: readonly { value: string; label: string }[];
};

/**
 * Filter daftar surat gaya GAS: pencarian + beberapa select (langsung diterapkan saat dipilih)
 * + rentang tanggal opsional. `hidden` meneruskan parameter lain (mis. tab) lewat form GET.
 */
export function SuratFilters({
  q,
  placeholder,
  selects,
  dates,
  hidden = {},
}: {
  q: string;
  placeholder: string;
  selects: Select[];
  dates?: { from: string; to: string; fromLabel: string; toLabel: string };
  hidden?: Record<string, string>;
}) {
  const apply = (e: { currentTarget: HTMLElement & { form: HTMLFormElement | null } }) =>
    e.currentTarget.form?.requestSubmit();
  return (
    <form method="get" role="search" className="flex flex-wrap items-center gap-2 p-4">
      {Object.entries(hidden).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <div className="relative min-w-[220px] flex-1">
        <label htmlFor="sf-q" className="sr-only">
          Cari
        </label>
        <Search
          aria-hidden="true"
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300"
        />
        <input
          id="sf-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={placeholder}
          className={`${inputClass} pl-10`}
        />
      </div>
      {selects.map((s) => (
        <div key={s.name}>
          <label htmlFor={`sf-${s.name}`} className="sr-only">
            {s.label}
          </label>
          <select
            id={`sf-${s.name}`}
            name={s.name}
            defaultValue={s.value}
            onChange={apply}
            className={`${inputClass} w-auto!`}
          >
            <option value="">{s.all}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {dates ? (
        <>
          <div>
            <label htmlFor="sf-from" className="sr-only">
              {dates.fromLabel}
            </label>
            <input
              id="sf-from"
              type="date"
              name="dari"
              title={dates.fromLabel}
              defaultValue={dates.from}
              onChange={apply}
              className={`${inputClass} w-auto!`}
            />
          </div>
          <div>
            <label htmlFor="sf-to" className="sr-only">
              {dates.toLabel}
            </label>
            <input
              id="sf-to"
              type="date"
              name="sampai"
              title={dates.toLabel}
              defaultValue={dates.to}
              onChange={apply}
              className={`${inputClass} w-auto!`}
            />
          </div>
        </>
      ) : null}
      <button type="submit" className={buttonClass.secondary}>
        Cari
      </button>
    </form>
  );
}
