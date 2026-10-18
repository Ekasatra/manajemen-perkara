/**
 * Aturan murni invoice (Agent F · F1–F2, PRD §5.8; label R4/W5). Tanpa DB agar bisa diuji penuh.
 * Status adalah turunan paid_amount — kolom DB `status` generated, tidak pernah ditulis.
 */
import { validationError } from '@ekasatra/shared';
import type { InvoiceStatus } from '@ekasatra/shared/invoices';

/**
 * Satu-satunya sumber status invoice (PRD masukan §4 R4): `paid = 0` → Belum Bayar;
 * `0 < paid < total` → Sudah Bayar Sebagian; `paid ≥ total` → Lunas. Dipanggil tiap
 * pembayaran dicatat/diubah/dihapus lewat kolom generated DB; tidak ada input status manual.
 */
export function deriveInvoiceStatus(total: number, paid: number): InvoiceStatus {
  if (paid <= 0) return 'Belum Bayar';
  return paid < total ? 'Sudah Bayar Sebagian' : 'Lunas';
}

export interface PaidState {
  amount: number;
  paidAmount: number;
  paidDate: string | null;
}

/** paid_date hanya ada saat Lunas: dipertahankan bila sudah ada, kosong bila tidak lagi Lunas. */
function settle(amount: number, paidAmount: number, current: string | null, date: string) {
  return paidAmount >= amount ? (current ?? date) : null;
}

/** Catat pembayaran: paid_amount += jumlah. Kelebihan bayar diterima (PRD: "≥ jumlah → Lunas"). */
export function applyPayment(state: PaidState, add: number, paymentDate: string): PaidState {
  if (!Number.isSafeInteger(add) || add <= 0) {
    throw validationError('Jumlah pembayaran harus bilangan bulat rupiah > 0');
  }
  const paidAmount = state.paidAmount + add;
  if (!Number.isSafeInteger(paidAmount)) throw validationError('Total pembayaran terlalu besar');
  return {
    amount: state.amount,
    paidAmount,
    paidDate: settle(state.amount, paidAmount, state.paidDate, paymentDate),
  };
}

/** Tandai Lunas: paid_amount = amount. Yang sudah ≥ amount tidak diubah (uang tidak berkurang). */
export function applyMarkPaid(state: PaidState, date: string): PaidState {
  const paidAmount = Math.max(state.paidAmount, state.amount);
  return {
    amount: state.amount,
    paidAmount,
    paidDate: settle(state.amount, paidAmount, state.paidDate, date),
  };
}

/** Jumlah tagihan diubah: paid_amount tetap, status & paid_date menyesuaikan. */
export function applyAmountChange(state: PaidState, amount: number, today: string): PaidState {
  return {
    amount,
    paidAmount: state.paidAmount,
    paidDate: settle(amount, state.paidAmount, state.paidDate, today),
  };
}
