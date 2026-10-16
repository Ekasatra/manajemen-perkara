import { buttonClass, inputClass } from '@/components/ui/styles';

/** Form filter GET (tanpa JS): `q` + status opsional; paginasi dipertahankan DataTable lewat link. */
export function FilterForm({
  q,
  status,
  statuses,
}: {
  q?: string;
  status?: string;
  statuses: readonly string[];
}) {
  return (
    <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
      <input
        name="q"
        defaultValue={q}
        placeholder="Cari nomor, perihal, pihak"
        aria-label="Cari"
        className={`${inputClass} sm:max-w-xs`}
      />
      <select name="status" defaultValue={status ?? ''} aria-label="Status" className={`${inputClass} sm:max-w-48`}>
        <option value="">Semua status</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>
      <button type="submit" className={buttonClass.secondary}>
        Terapkan
      </button>
    </form>
  );
}
