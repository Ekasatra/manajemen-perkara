'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { useToast } from '@/shell/toast';

type Props = {
  initialSettings: Record<string, unknown>;
  canEdit: boolean;
};

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function SettingsForm({ initialSettings, canEdit }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const body: Record<string, unknown> = {
        office_name: String(fd.get('office_name') ?? ''),
        office_address: String(fd.get('office_address') ?? ''),
        office_phone: String(fd.get('office_phone') ?? ''),
        office_email: String(fd.get('office_email') ?? ''),
        kas_kantor_persen: Number(fd.get('kas_kantor_persen') ?? 20),
        banding_deadline_days: Number(fd.get('banding_deadline_days') ?? 14),
        reminder_days: Number(fd.get('reminder_days') ?? 3),
        scope_assigned_only: fd.get('scope_assigned_only') === 'on',
        notif_email_enabled: fd.get('notif_email_enabled') === 'on',
        client_types: String(fd.get('client_types') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        opponent_types: String(fd.get('opponent_types') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menyimpan');
      toast.show('Pengaturan disimpan', 'success');
      router.refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setPending(false);
    }
  }

  const ct = Array.isArray(initialSettings.client_types) ? (initialSettings.client_types as string[]).join(', ') : 'Perorangan, Perusahaan, Instansi';
  const ot = Array.isArray(initialSettings.opponent_types) ? (initialSettings.opponent_types as string[]).join(', ') : 'Perorangan, Perusahaan, Instansi';

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <fieldset className="flex flex-col gap-3 rounded-md border border-navy-200 p-4">
        <legend className="px-2 text-sm font-medium text-navy-600">Profil Kantor</legend>
        <div>
          <label htmlFor="office_name" className={labelClass}>Nama Kantor</label>
          <input id="office_name" name="office_name" defaultValue={str(initialSettings.office_name)} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label htmlFor="office_address" className={labelClass}>Alamat</label>
          <textarea id="office_address" name="office_address" rows={2} defaultValue={str(initialSettings.office_address)} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label htmlFor="office_phone" className={labelClass}>Telepon</label>
          <input id="office_phone" name="office_phone" type="tel" defaultValue={str(initialSettings.office_phone)} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label htmlFor="office_email" className={labelClass}>Email</label>
          <input id="office_email" name="office_email" type="email" defaultValue={str(initialSettings.office_email)} disabled={!canEdit} className={inputClass} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-md border border-navy-200 p-4">
        <legend className="px-2 text-sm font-medium text-navy-600">Aturan Bisnis</legend>
        <div>
          <label htmlFor="kas_kantor_persen" className={labelClass}>Persen Kas Kantor (%)</label>
          <input id="kas_kantor_persen" name="kas_kantor_persen" type="number" min={0} max={100} defaultValue={str(initialSettings.kas_kantor_persen, '20')} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label htmlFor="banding_deadline_days" className={labelClass}>Deadline Banding (hari)</label>
          <input id="banding_deadline_days" name="banding_deadline_days" type="number" min={0} defaultValue={str(initialSettings.banding_deadline_days, '14')} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label htmlFor="reminder_days" className={labelClass}>Reminder Sidang (hari)</label>
          <input id="reminder_days" name="reminder_days" type="number" min={0} defaultValue={str(initialSettings.reminder_days, '3')} disabled={!canEdit} className={inputClass} />
        </div>
        <div className="flex items-center gap-2">
          <input id="scope_assigned_only" name="scope_assigned_only" type="checkbox" defaultChecked={Boolean(initialSettings.scope_assigned_only)} disabled={!canEdit} className="size-4" />
          <label htmlFor="scope_assigned_only" className="text-sm text-navy-800">Hanya tampilkan perkara yang ditugaskan</label>
        </div>
        <div className="flex items-center gap-2">
          <input id="notif_email_enabled" name="notif_email_enabled" type="checkbox" defaultChecked={Boolean(initialSettings.notif_email_enabled)} disabled={!canEdit} className="size-4" />
          <label htmlFor="notif_email_enabled" className="text-sm text-navy-800">Notifikasi email aktif</label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-md border border-navy-200 p-4">
        <legend className="px-2 text-sm font-medium text-navy-600">Daftar Dinamis</legend>
        <div>
          <label htmlFor="client_types" className={labelClass}>Tipe Klien (pisah koma)</label>
          <input id="client_types" name="client_types" defaultValue={ct} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label htmlFor="opponent_types" className={labelClass}>Tipe Pihak Lawan (pisah koma)</label>
          <input id="opponent_types" name="opponent_types" defaultValue={ot} disabled={!canEdit} className={inputClass} />
        </div>
      </fieldset>

      {canEdit ? (
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? 'Menyimpan…' : 'Simpan Pengaturan'}
        </button>
      ) : null}
    </form>
  );
}
