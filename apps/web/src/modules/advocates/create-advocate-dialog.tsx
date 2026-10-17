'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';

export function CreateAdvocateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const fullName = String(formData.get('fullName') ?? '');
    const address = String(formData.get('address') ?? '');
    const phone = String(formData.get('phone') ?? '');
    const bankAccount = String(formData.get('bankAccount') ?? '');
    const bankName = String(formData.get('bankName') ?? '');
    const licenseNumber = String(formData.get('licenseNumber') ?? '');
    const eduLevel = String(formData.get('eduLevel') ?? '');
    const eduInstitution = String(formData.get('eduInstitution') ?? '');
    const eduYear = String(formData.get('eduYear') ?? '');

    if (!fullName || !address || !phone || !bankAccount || !eduLevel || !eduInstitution) {
      throw new Error('Nama, alamat, telepon, rekening, dan pendidikan wajib diisi');
    }

    const res = await fetch('/api/v1/advocates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        address,
        phone,
        bankAccount,
        bankName: bankName || undefined,
        licenseNumber: licenseNumber || undefined,
        education: [
          {
            level: eduLevel,
            institution: eduInstitution,
            ...(eduYear ? { year: eduYear } : {}),
          },
        ],
        trainings: [],
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat data advokat');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        Tambah Advokat
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Data Advokat"
        description="Wajib: nama, alamat, telepon, rekening, pendidikan min 1."
        submitLabel="Buat"
        onSubmit={handleSubmit}
      >
        <RequiredNote />
        <div>
          <Label htmlFor="ca-name" required>
            Nama Lengkap
          </Label>
          <input id="ca-name" name="fullName" type="text" required className={inputClass} />
        </div>
        <div>
          <Label htmlFor="ca-address" required>
            Alamat
          </Label>
          <textarea id="ca-address" name="address" rows={2} required className={inputClass} />
        </div>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="ca-phone" required>
              Telepon
            </Label>
            <input id="ca-phone" name="phone" type="tel" required className={inputClass} />
          </div>
          <div>
            <Label htmlFor="ca-license" optional>
              Nomor Lisensi
            </Label>
            <input id="ca-license" name="licenseNumber" type="text" className={inputClass} />
          </div>
          <div>
            <Label htmlFor="ca-bankName" optional>
              Nama Bank
            </Label>
            <input id="ca-bankName" name="bankName" type="text" className={inputClass} />
          </div>
          <div>
            <Label htmlFor="ca-bankAccount" required>
              Nomor Rekening
            </Label>
            <input
              id="ca-bankAccount"
              name="bankAccount"
              type="text"
              required
              className={inputClass}
            />
          </div>
        </div>
        <fieldset className="rounded-control border border-navy-100 p-4">
          <legend className="px-2 text-sm font-bold text-navy-800">Pendidikan (minimal 1)</legend>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <div>
              <Label htmlFor="ca-edu-level" required>
                Jenjang
              </Label>
              <input
                id="ca-edu-level"
                name="eduLevel"
                type="text"
                placeholder="S1, S2, dll"
                required
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="ca-edu-inst" required>
                Institusi
              </Label>
              <input
                id="ca-edu-inst"
                name="eduInstitution"
                type="text"
                required
                className={inputClass}
              />
            </div>
            <div>
              {/* Teks label sudah memuat "(opsional)" — penanda Label tidak ditambah agar tidak ganda. */}
              <Label htmlFor="ca-edu-year">Tahun (opsional)</Label>
              <input id="ca-edu-year" name="eduYear" type="text" className={inputClass} />
            </div>
          </div>
        </fieldset>
      </FormDialog>
    </>
  );
}
