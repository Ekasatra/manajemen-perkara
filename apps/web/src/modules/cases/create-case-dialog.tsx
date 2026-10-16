'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { useToast } from '@/shell/toast';
import { CASE_TYPES, INITIAL_TIMELINE_TYPES } from './constants';

type ClientOption = { id: string; name: string; clientCode: string };
type OpponentOption = { id: string; name: string };
type StaffOption = { id: string; fullName: string; role: string };

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message ?? 'Permintaan gagal');
  return data.data;
}

function todayIso(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Registrasi perkara gaya GAS: data perkara, tim (hanya yang berhak mengatur tim), dan tahap awal
 * timeline. Pembuatan, penugasan tim, dan timeline awal dikirim berurutan; bila langkah lanjutan
 * gagal, perkara tetap tersimpan dan sisanya bisa diisi dari halaman detail.
 */
export function CreateCaseDialog({ canAssignTeam = false }: { canAssignTeam?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [opponents, setOpponents] = useState<OpponentOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  useEffect(() => {
    if (!open) return;
    const get = (url: string) =>
      fetch(url)
        .then((r) => r.json())
        .catch(() => ({ ok: false }));
    get('/api/v1/clients?pageSize=100').then((d) => d.ok && setClients(d.data.rows));
    get('/api/v1/opponents?pageSize=100').then((d) => d.ok && setOpponents(d.data.rows));
    if (canAssignTeam) get('/api/v1/users?pageSize=100').then((d) => d.ok && setStaff(d.data.rows));
  }, [open, canAssignTeam]);

  async function handleSubmit(fd: FormData) {
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    if (!str('clientId')) throw new Error('Klien wajib dipilih');

    const created = await call('/api/v1/cases', 'POST', {
      title: str('title'),
      clientId: str('clientId'),
      opponentId: str('opponentId') || null,
      caseNumber: str('caseNumber') || undefined,
      court: str('court') || undefined,
      caseType: str('caseType') || undefined,
      description: str('description') || undefined,
      startDate: str('startDate') || undefined,
    });
    const caseId: string = created.id;

    const warnings: string[] = [];
    if (canAssignTeam) {
      const members = [
        ...fd.getAll('advokat').map((u) => ({ userId: String(u), peran: 'Advokat' })),
        ...fd.getAll('paralegal').map((u) => ({ userId: String(u), peran: 'Paralegal' })),
        ...(str('manager') ? [{ userId: str('manager'), peran: 'Manager' }] : []),
      ];
      for (const m of members) {
        try {
          await call(`/api/v1/cases/${caseId}/members`, 'POST', m);
        } catch {
          warnings.push('tim');
          break;
        }
      }
    }
    if (str('tlDesc')) {
      try {
        await call(`/api/v1/cases/${caseId}/timeline`, 'POST', {
          eventType: str('tlType') || 'Catatan',
          eventDate: str('tlDate') || undefined,
          title: str('tlDesc'),
        });
      } catch {
        warnings.push('timeline');
      }
    }

    setOpen(false);
    toast.show(
      warnings.length
        ? `Perkara dibuat, tetapi ${warnings.join(' dan ')} belum tersimpan. Lengkapi dari halaman detail.`
        : `Perkara teregistrasi: ${created.regNo}`,
      warnings.length ? 'info' : 'success',
    );
    router.push(`/cases/${caseId}`);
    router.refresh();
  }

  const byRole = (r: string) => staff.filter((s) => s.role === r);
  const advocateChoices = staff.filter(
    (s) => s.role === 'Advokat' || s.role === 'Admin' || s.role === 'SuperAdmin',
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        <Plus aria-hidden="true" size={15} /> Registrasi Perkara
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrasi Perkara Baru"
        description="Nomor REG/{tahun}/ dibuat otomatis. Advokat pembuat otomatis menjadi anggota tim."
        submitLabel="Registrasi"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="cc-title" className={labelClass}>
            Pokok Perkara / Judul
          </label>
          <input
            id="cc-title"
            name="title"
            required
            placeholder="mis. Gugatan Wanprestasi PT A vs PT B"
            className={inputClass}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cc-casenumber" className={labelClass}>
              Nomor Perkara
            </label>
            <input
              id="cc-casenumber"
              name="caseNumber"
              placeholder="Nomor register pengadilan bila sudah terbit"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cc-casetype" className={labelClass}>
              Jenis Perkara
            </label>
            <select id="cc-casetype" name="caseType" defaultValue="" className={inputClass}>
              <option value="">Pilih jenis</option>
              {CASE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cc-client" className={labelClass}>
              Klien
            </label>
            <select id="cc-client" name="clientId" required defaultValue="" className={inputClass}>
              <option value="">Pilih klien</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientCode} · {c.name}
                </option>
              ))}
            </select>
            {clients.length === 0 ? (
              <p className="mt-1 text-xs text-navy-400">
                Belum ada klien. Tambahkan dulu di menu Klien.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="cc-opp" className={labelClass}>
              Pihak Lawan
            </label>
            <select id="cc-opp" name="opponentId" defaultValue="" className={inputClass}>
              <option value="">Tanpa pihak lawan</option>
              {opponents.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cc-court" className={labelClass}>
              Pengadilan / Forum
            </label>
            <input
              id="cc-court"
              name="court"
              placeholder="Pengadilan Negeri Jakarta Selatan"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cc-start" className={labelClass}>
              Tanggal Daftar
            </label>
            <input
              id="cc-start"
              name="startDate"
              type="date"
              defaultValue={todayIso()}
              className={inputClass}
            />
          </div>
        </div>

        {canAssignTeam ? (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className={`${labelClass} mb-2`}>Tim perkara</legend>
            <div>
              <label htmlFor="cc-adv" className={labelClass}>
                Advokat (boleh lebih dari satu)
              </label>
              <select id="cc-adv" name="advokat" multiple size={4} className={inputClass}>
                {advocateChoices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cc-par" className={labelClass}>
                Paralegal (boleh lebih dari satu)
              </label>
              <select id="cc-par" name="paralegal" multiple size={4} className={inputClass}>
                {byRole('Paralegal').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cc-mgr" className={labelClass}>
                Manajer Kasus (satu orang)
              </label>
              <select id="cc-mgr" name="manager" defaultValue="" className={inputClass}>
                <option value="">Belum ditentukan</option>
                {staff
                  .filter((s) => s.role === 'Advokat' || s.role === 'Admin')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
              </select>
            </div>
          </fieldset>
        ) : (
          <p className="rounded-control bg-navy-50 p-3 text-xs text-navy-600">
            Anggota tim lain diatur oleh Admin dari halaman detail perkara.
          </p>
        )}

        <div>
          <label htmlFor="cc-desc" className={labelClass}>
            Catatan
          </label>
          <textarea id="cc-desc" name="description" rows={2} className={inputClass} />
        </div>

        <fieldset className="rounded-control bg-navy-50/60 p-3">
          <legend className="px-1 text-sm font-bold text-navy-800">
            Tahap Awal Timeline (opsional)
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="cc-tltype" className={labelClass}>
                Tahap
              </label>
              <select id="cc-tltype" name="tlType" defaultValue="Catatan" className={inputClass}>
                {INITIAL_TIMELINE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cc-tldate" className={labelClass}>
                Tanggal
              </label>
              <input
                id="cc-tldate"
                name="tlDate"
                type="date"
                defaultValue={todayIso()}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="cc-tldesc" className={labelClass}>
                Keterangan
              </label>
              <input id="cc-tldesc" name="tlDesc" className={inputClass} />
            </div>
          </div>
        </fieldset>
      </FormDialog>
    </>
  );
}
