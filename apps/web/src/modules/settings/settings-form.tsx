'use client';

import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ImageIcon, Save, ShieldCheck, Tags, Upload, Workflow, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { useToast } from '@/shell/toast';

export type MatrixRow = { label: string; cells: string[] };

type Props = {
  initialSettings: Record<string, unknown>;
  canEdit: boolean;
  leaders: { id: string; name: string }[];
  matrix: MatrixRow[];
  roleHeaders: string[];
};

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const list = (v: unknown, fallback: string): string =>
  Array.isArray(v) ? (v as string[]).join(', ') : fallback;
const yesNo = (v: unknown, fallback: boolean): string =>
  (typeof v === 'boolean' ? v : fallback) ? 'Ya' : 'Tidak';

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="card-surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-navy-800">
        <span aria-hidden="true" className="text-gold-500">
          {icon}
        </span>
        {title}
      </h2>
      <p className="mb-5 mt-1 text-xs text-navy-400">{desc}</p>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  full = false,
  help,
  children,
}: {
  id: string;
  label: string;
  full?: boolean;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {help ? <p className="mt-1.5 text-[11px] text-navy-400">{help}</p> : null}
    </div>
  );
}

export function SettingsForm({ initialSettings: s, canEdit, leaders, matrix, roleHeaders }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasLogo = Boolean(str(s.logo_path));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const text = (k: string) => String(fd.get(k) ?? '').trim();
      const csv = (k: string) =>
        text(k)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
      const body: Record<string, unknown> = {
        office_name: text('office_name'),
        office_address: text('office_address'),
        office_city: text('office_city'),
        office_phone: text('office_phone'),
        office_email: text('office_email'),
        office_website: text('office_website'),
        kas_kantor_persen: Number(text('kas_kantor_persen') || 20),
        banding_deadline_days: Number(text('banding_deadline_days') || 14),
        reminder_days: Number(text('reminder_days') || 3),
        scope_assigned_only: text('scope_assigned_only') === 'Ya',
        notif_email_enabled: text('notif_email_enabled') === 'Ya',
        pimpinan_user_id: text('pimpinan_user_id'),
        client_types: csv('client_types'),
        opponent_types: csv('opponent_types'),
      };
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menyimpan');
      toast.show('Pengaturan disimpan.', 'success');
      router.refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setPending(false);
    }
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/v1/settings/logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Gagal mengunggah logo');
      toast.show('Logo kop surat diperbarui.', 'success');
      router.refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Gagal mengunggah logo', 'error');
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    try {
      const res = await fetch('/api/v1/settings/logo', { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menghapus logo');
      toast.show('Kop kembali tanpa logo.', 'success');
      router.refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Gagal menghapus logo', 'error');
    } finally {
      setLogoBusy(false);
    }
  }

  const dis = !canEdit;

  return (
    <div>
      <PageHeader
        title="Pengaturan Sistem"
        description={
          canEdit
            ? 'Konfigurasi kantor, alur kerja, dan peran.'
            : 'Mode lihat: hanya Admin yang dapat mengubah pengaturan.'
        }
        actions={
          canEdit ? (
            <button
              type="submit"
              form="settings-form"
              disabled={pending}
              className={buttonClass.primary}
            >
              <Save aria-hidden="true" size={15} /> {pending ? 'Menyimpan…' : 'Simpan Pengaturan'}
            </button>
          ) : null
        }
      />

      <form id="settings-form" onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-2">
        <Section
          icon={<Building2 size={16} />}
          title="Profil Kantor"
          desc="Dipakai pada kop surat, invoice, laporan, dan portal klien."
        >
          <Field id="office_name" label="Nama Kantor" full>
            <input
              id="office_name"
              name="office_name"
              defaultValue={str(s.office_name)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="office_address" label="Alamat" full>
            <input
              id="office_address"
              name="office_address"
              defaultValue={str(s.office_address)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="office_city" label="Kota (tempat surat)">
            <input
              id="office_city"
              name="office_city"
              defaultValue={str(s.office_city)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="office_phone" label="Telepon">
            <input
              id="office_phone"
              name="office_phone"
              type="tel"
              defaultValue={str(s.office_phone)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="office_email" label="Email">
            <input
              id="office_email"
              name="office_email"
              type="email"
              defaultValue={str(s.office_email)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="office_website" label="Website">
            <input
              id="office_website"
              name="office_website"
              defaultValue={str(s.office_website)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
        </Section>

        <Section
          icon={<Tags size={16} />}
          title="Tipe Klien, Pihak Lawan & Kas Kantor"
          desc="Daftar tipe dipisahkan koma."
        >
          <Field id="client_types" label="Tipe Klien" full>
            <input
              id="client_types"
              name="client_types"
              defaultValue={list(s.client_types, 'Perorangan, Perusahaan, Instansi')}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="opponent_types" label="Tipe Pihak Lawan" full>
            <input
              id="opponent_types"
              name="opponent_types"
              defaultValue={list(s.opponent_types, 'Perorangan, Perusahaan, Instansi')}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field
            id="kas_kantor_persen"
            label="Kas Kantor (% dipotong dari biaya perkara)"
            full
            help="Sisanya (100% dikurangi nilai ini) dapat didistribusikan sebagai honor tim."
          >
            <input
              id="kas_kantor_persen"
              name="kas_kantor_persen"
              type="number"
              min={0}
              max={100}
              step={0.5}
              defaultValue={String(s.kas_kantor_persen ?? 20)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
        </Section>

        <Section
          icon={<Workflow size={16} />}
          title="Alur Kerja & Notifikasi"
          desc="Penandatangan surat Instansi, batas upaya hukum, dan pengingat."
        >
          <Field id="pimpinan_user_id" label="Pimpinan Firma (TTD surat Instansi)" full>
            <select
              id="pimpinan_user_id"
              name="pimpinan_user_id"
              defaultValue={str(s.pimpinan_user_id)}
              disabled={dis}
              className={inputClass}
            >
              <option value="">Otomatis: Admin pertama</option>
              {leaders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="banding_deadline_days" label="Batas Upaya Hukum (hari)">
            <input
              id="banding_deadline_days"
              name="banding_deadline_days"
              type="number"
              min={1}
              defaultValue={String(s.banding_deadline_days ?? 14)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="reminder_days" label="Pengingat Sidang (H-…)">
            <input
              id="reminder_days"
              name="reminder_days"
              type="number"
              min={1}
              defaultValue={String(s.reminder_days ?? 3)}
              disabled={dis}
              className={inputClass}
            />
          </Field>
          <Field id="notif_email_enabled" label="Notifikasi Email">
            <select
              id="notif_email_enabled"
              name="notif_email_enabled"
              defaultValue={yesNo(s.notif_email_enabled, true)}
              disabled={dis}
              className={inputClass}
            >
              <option>Ya</option>
              <option>Tidak</option>
            </select>
          </Field>
          <Field id="scope_assigned_only" label="Advokat/Paralegal hanya lihat perkara sendiri">
            <select
              id="scope_assigned_only"
              name="scope_assigned_only"
              defaultValue={yesNo(s.scope_assigned_only, true)}
              disabled={dis}
              className={inputClass}
            >
              <option>Ya</option>
              <option>Tidak</option>
            </select>
          </Field>
        </Section>

        <section className="card-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy-800">
            <ImageIcon aria-hidden="true" size={16} className="text-gold-500" /> Logo Kop
          </h2>
          <p className="mb-5 mt-1 text-xs text-navy-400">
            Logo dipakai pada kop PDF invoice dan kuitansi (PNG/JPG, maks 2 MB, disarankan versi
            horizontal).
          </p>
          <div className="flex flex-wrap items-center gap-4 rounded-control bg-navy-50/60 p-3">
            <div className="flex h-14 w-40 items-center justify-center rounded-lg bg-surface text-xs text-navy-400">
              {hasLogo ? 'Logo terpasang' : 'Tanpa logo'}
            </div>
            <p className="min-w-0 flex-1 text-xs text-navy-500">
              {hasLogo
                ? 'Kop surat memakai logo yang diunggah.'
                : 'Kop surat hanya memuat nama dan alamat kantor.'}
            </p>
            {canEdit ? (
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  id="logo-in"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                  }}
                />
                <label
                  htmlFor="logo-in"
                  className={`${buttonClass.secondary} min-h-9 cursor-pointer px-3 py-1.5 text-xs ${logoBusy ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <Upload aria-hidden="true" size={14} /> Unggah
                </label>
                {hasLogo ? (
                  <button
                    type="button"
                    onClick={() => void removeLogo()}
                    disabled={logoBusy}
                    aria-label="Hapus logo"
                    title="Kembali tanpa logo"
                    className="inline-flex size-9 items-center justify-center rounded-control text-navy-500 hover:bg-danger-bg hover:text-danger-fg"
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </form>

      <section className="card-surface mt-4 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-navy-800">
          <ShieldCheck aria-hidden="true" size={16} className="text-gold-500" /> Matriks Peran & Hak
          Akses
        </h2>
        <p className="mb-4 text-xs text-navy-400">
          L = lihat · T = tambah · U = ubah · H = hapus. Ditegakkan di server. Perkara dibatasi pada
          yang ditugaskan; * Advokat/Paralegal hanya data dirinya sendiri. Honor Tim: Admin penuh,
          lainnya hanya honor sendiri.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Matriks hak akses per peran</caption>
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] uppercase tracking-wider text-navy-400">
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Modul
                </th>
                {roleHeaders.map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-center font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {matrix.map((row) => (
                <tr key={row.label} className="hover:bg-gold-50/40">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-navy-800">
                    {row.label}
                  </th>
                  {row.cells.map((c, i) => (
                    <td key={i} className="px-4 py-2.5 text-center">
                      <span
                        className={`font-mono text-xs ${c ? 'font-semibold text-navy-800' : 'text-navy-300'}`}
                      >
                        {c || '—'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
