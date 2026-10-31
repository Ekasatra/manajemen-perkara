'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatDate } from '@/lib/format';
import { buttonClass } from '@/components/ui/styles';

type EducationItem = { level?: string; institution?: string; year?: string };
type TrainingItem = { name?: string; organizer?: string; year?: string };

export type AdvocateDetail = {
  id: string;
  userId: string | null;
  fullName: string;
  kind?: string;
  email?: string | null;
  address: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccount: string | null;
  licenseNumber: string | null;
  education: unknown;
  trainings: unknown;
  createdAt: Date | string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function join(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

/**
 * R6 (PRD-MASUKAN §4): nama advokat menjadi tombol yang membuka dialog read-only berisi
 * semua data advokat. Form native `<dialog>` menangani fokus terjebak, Esc, dan inert latar;
 * `aria-labelledby` menautkan judul. Tidak ada aksi ubah/hapus di sini (itu di AdvocateActions).
 */
export function AdvocateDetailDialog({ advocate }: { advocate: AdvocateDetail }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const education = asArray<EducationItem>(advocate.education);
  const trainings = asArray<TrainingItem>(advocate.trainings);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="text-left font-semibold text-navy-800 underline-offset-2 hover:underline focus-visible:underline"
      >
        {advocate.fullName}
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-labelledby={titleId}
        className="m-auto w-full rounded-card bg-surface p-0 text-navy-800 shadow-float backdrop:bg-navy-950/45 backdrop:backdrop-blur-sm sm:max-w-xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-5 p-6">
          <div>
            <h2 id={titleId} className="text-base">
              Data {advocate.kind ?? 'Advokat'}
            </h2>
            <p className="mt-1 text-sm text-navy-400">
              Hanya lihat. Hubungi Admin bila ada data yang perlu diubah.
            </p>
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Nama Lengkap" value={advocate.fullName} />
            <Field label="Email Akun" value={advocate.email ?? null} />
            <Field label="No. KTA" value={advocate.licenseNumber} />
            <Field label="Telepon" value={advocate.phone} />
            <Field label="Nama Bank" value={advocate.bankName} />
            <Field label="Nomor Rekening" value={advocate.bankAccount} />
            <Field
              label="Akun Terhubung"
              value={advocate.userId ? 'Terhubung ke akun pengguna' : 'Belum terhubung ke akun'}
            />
            <Field label="Terdaftar" value={formatDate(advocate.createdAt)} />
            <Field label="Alamat" value={advocate.address} />
          </dl>

          <section>
            <h3 className="text-sm font-bold text-navy-800">Pendidikan</h3>
            {education.length === 0 ? (
              <p className="text-sm text-navy-400">—</p>
            ) : (
              <ul className="mt-1 list-disc pl-5 text-sm text-navy-600">
                {education.map((e) => (
                  <li key={`${e.level}-${e.institution}-${e.year ?? ''}`}>
                    {join([e.level, e.institution, e.year]) || '—'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-bold text-navy-800">Pelatihan</h3>
            {trainings.length === 0 ? (
              <p className="text-sm text-navy-400">—</p>
            ) : (
              <ul className="mt-1 list-disc pl-5 text-sm text-navy-600">
                {trainings.map((t) => (
                  <li key={`${t.name}-${t.organizer}-${t.year ?? ''}`}>
                    {join([t.name, t.organizer, t.year]) || '—'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-1 flex justify-end border-t border-navy-100 pt-5">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass.secondary}>
              Tutup
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="text-sm text-navy-700">{value || '—'}</dd>
    </div>
  );
}
