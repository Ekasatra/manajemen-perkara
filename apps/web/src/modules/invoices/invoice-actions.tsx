'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { Label } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { formatRupiah } from '@/lib/format';
import { callApi, parseRupiah } from './api-client';

type Props = {
  id: string;
  invoiceNo: string;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  description: string | null;
  /** Hanya Superadmin (`can(user, 'D', 'invoices')` dari server). */
  canDelete: boolean;
};

type Dialog = 'payment' | 'edit' | 'delete' | null;

/** Aksi pada detail invoice. Status & paid_date selalu dihitung server dari paid_amount. */
export function InvoiceActions({
  id,
  invoiceNo,
  amount,
  paidAmount,
  dueDate,
  description,
  canDelete,
}: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/api/v1/invoices/${id}`;
  const lunas = paidAmount >= amount;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function pay(form: FormData) {
    const value = parseRupiah(form.get('amount'), 'Jumlah pembayaran');
    if (value <= 0) throw new Error('Jumlah pembayaran harus lebih dari 0');
    const paidDate = String(form.get('paidDate') ?? '');
    await callApi(`${base}/payments`, 'POST', { amount: value, ...(paidDate ? { paidDate } : {}) });
    setDialog(null);
    router.refresh();
  }

  async function remove() {
    await callApi(base, 'DELETE');
    setDialog(null);
    router.push('/invoices');
  }

  async function edit(form: FormData) {
    const value = parseRupiah(form.get('amount'), 'Jumlah');
    if (value <= 0) throw new Error('Jumlah harus lebih dari 0');
    const due = String(form.get('dueDate') ?? '');
    await callApi(base, 'PATCH', {
      amount: value,
      dueDate: due || null,
      description: String(form.get('description') ?? '').trim() || null,
    });
    setDialog(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-[12px]">
        <button type="button" className={buttonClass.primary} onClick={() => setDialog('payment')}>
          Catat Pembayaran
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          disabled={busy || lunas}
          onClick={() => run(() => callApi(`${base}/mark-paid`, 'POST'))}
        >
          Tandai Lunas
        </button>
        <button type="button" className={buttonClass.secondary} onClick={() => setDialog('edit')}>
          Ubah
        </button>
        <a
          className={buttonClass.secondary}
          href={`${base}/pdf?type=invoice`}
          target="_blank"
          rel="noreferrer"
        >
          PDF Invoice
        </a>
        {paidAmount > 0 && (
          <a
            className={buttonClass.secondary}
            href={`${base}/pdf?type=receipt`}
            target="_blank"
            rel="noreferrer"
          >
            PDF Kuitansi
          </a>
        )}
        {canDelete && paidAmount === 0 && (
          <button
            type="button"
            className={`${buttonClass.secondary} text-danger-fg`}
            onClick={() => setDialog('delete')}
          >
            Hapus
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-fg">
          {error}
        </p>
      )}

      {canDelete && dialog === 'delete' ? (
        <FormDialog
          open
          onClose={() => setDialog(null)}
          title="Hapus invoice?"
          description={`${invoiceNo} akan dihapus permanen dan tidak bisa dikembalikan.`}
          submitLabel="Hapus"
          destructive
          onSubmit={remove}
        >
          <p className="text-sm text-navy-600">
            Invoice yang sudah ada pembayaran tidak dapat dihapus. Tindakan ini tercatat di Audit
            Log.
          </p>
        </FormDialog>
      ) : null}

      <FormDialog
        open={dialog === 'payment'}
        onClose={() => setDialog(null)}
        title="Catat Pembayaran"
        description={`Sisa tagihan: ${formatRupiah(Math.max(amount - paidAmount, 0))}`}
        submitLabel="Catat"
        onSubmit={pay}
      >
        <div>
          <Label htmlFor="pay-amount" required>
            Jumlah dibayar (Rp)
          </Label>
          <input
            id="pay-amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="pay-date" optional>
            Tanggal bayar
          </Label>
          <input id="pay-date" name="paidDate" type="date" className={inputClass} />
        </div>
      </FormDialog>

      <FormDialog
        open={dialog === 'edit'}
        onClose={() => setDialog(null)}
        title={`Ubah ${invoiceNo}`}
        submitLabel="Simpan"
        onSubmit={edit}
      >
        <div>
          <Label htmlFor="edit-amount" optional>
            Jumlah (Rp)
          </Label>
          <input
            id="edit-amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue={amount}
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="edit-due" optional>
            Jatuh tempo
          </Label>
          <input
            id="edit-due"
            name="dueDate"
            type="date"
            defaultValue={dueDate ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="edit-desc" optional>
            Keterangan
          </Label>
          <textarea
            id="edit-desc"
            name="description"
            rows={2}
            defaultValue={description ?? ''}
            className={inputClass}
          />
        </div>
      </FormDialog>
    </div>
  );
}
