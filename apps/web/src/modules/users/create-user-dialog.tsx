'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

export function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const res = await fetch('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(formData.get('email') ?? ''),
        fullName: String(formData.get('fullName') ?? ''),
        role: String(formData.get('role') ?? 'Paralegal'),
        password: String(formData.get('password') ?? ''),
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat user');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass.primary}
      >
        Tambah Pengguna
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Pengguna"
        description="Buat akun baru untuk staf kantor."
        submitLabel="Buat"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="cu-name" className={labelClass}>
            Nama Lengkap
          </label>
          <input id="cu-name" name="fullName" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="cu-email" className={labelClass}>
            Email
          </label>
          <input id="cu-email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="cu-role" className={labelClass}>
            Role
          </label>
          <select id="cu-role" name="role" required defaultValue="Paralegal" className={inputClass}>
            <option value="Admin">Admin</option>
            <option value="Advokat">Advokat</option>
            <option value="Paralegal">Paralegal</option>
          </select>
        </div>
        <div>
          <label htmlFor="cu-pass" className={labelClass}>
            Password
          </label>
          <input
            id="cu-pass"
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-navy-400">Minimal 8 karakter.</p>
        </div>
      </FormDialog>
    </>
  );
}
