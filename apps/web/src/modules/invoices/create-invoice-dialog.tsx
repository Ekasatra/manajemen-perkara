'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { callApi, parseRupiah } from './api-client';

type Option = { id: string; label: string };

export function CreateInvoiceDialog({
  clients,
  cases,
}: {
  clients: Option[];
  cases: (Option & { clientId: string })[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function submit(form: FormData) {
    const caseId = String(form.get('caseId') ?? '');
    const clientId = String(form.get('clientId') ?? '');
    if (!caseId && !clientId) throw new Error('Pilih perkara atau klien');
    const amount = parseRupiah(form.get('amount'), 'Jumlah');
    if (amount <= 0) throw new Error('Jumlah harus lebih dari 0');
    const invoiceDate = String(form.get('invoiceDate') ?? '');
    const dueDate = String(form.get('dueDate') ?? '');
    const description = String(form.get('description') ?? '').trim();
    await callApi('/api/v1/invoices', 'POST', {
      // Klien diturunkan server dari perkara bila perkara dipilih.
      ...(caseId ? { caseId } : { clientId }),
      amount,
      ...(invoiceDate ? { invoiceDate } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(description ? { description } : {}),
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        Buat Invoice
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Buat Invoice"
        description="Nomor invoice (INV/tahun/nomor) dibuat otomatis. Pilih perkara atau klien."
        submitLabel="Buat"
        onSubmit={submit}
      >
        <div>
          <label htmlFor="inv-case" className={labelClass}>
            Perkara
          </label>
          <select id="inv-case" name="caseId" className={inputClass} defaultValue="">
            <option value="">— tanpa perkara —</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inv-client" className={labelClass}>
            Klien{' '}
            <span className="font-normal text-navy-500">(diabaikan bila perkara dipilih)</span>
          </label>
          <select id="inv-client" name="clientId" className={inputClass} defaultValue="">
            <option value="">— pilih klien —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inv-amount" className={labelClass}>
            Jumlah (Rp)
          </label>
          <input
            id="inv-amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inv-date" className={labelClass}>
              Tanggal invoice
            </label>
            <input id="inv-date" name="invoiceDate" type="date" className={inputClass} />
          </div>
          <div>
            <label htmlFor="inv-due" className={labelClass}>
              Jatuh tempo
            </label>
            <input id="inv-due" name="dueDate" type="date" className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="inv-desc" className={labelClass}>
            Keterangan
          </label>
          <textarea id="inv-desc" name="description" rows={2} className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
