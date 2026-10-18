import { describe, expect, it } from 'vitest';
import {
  applyAmountChange,
  applyMarkPaid,
  applyPayment,
  deriveInvoiceStatus,
  type PaidState,
} from '../src/invoices';

const base = (over: Partial<PaidState> = {}): PaidState => ({
  amount: 1_000_000,
  paidAmount: 0,
  paidDate: null,
  ...over,
});

describe('deriveInvoiceStatus (PRD masukan §4 R4)', () => {
  it('tiga status: 0 → Belum Bayar; 0<x<jumlah → Sudah Bayar Sebagian; ≥jumlah → Lunas', () => {
    expect(deriveInvoiceStatus(1000, 0)).toBe('Belum Bayar');
    expect(deriveInvoiceStatus(1000, 1)).toBe('Sudah Bayar Sebagian');
    expect(deriveInvoiceStatus(1000, 999)).toBe('Sudah Bayar Sebagian');
    expect(deriveInvoiceStatus(1000, 1000)).toBe('Lunas');
  });

  it('pembayaran melebihi total tetap Lunas', () => {
    expect(deriveInvoiceStatus(1000, 1001)).toBe('Lunas');
    expect(deriveInvoiceStatus(1000, 5_000_000)).toBe('Lunas');
  });

  it('tepat di batas: jumlah kecil tidak punya status antara', () => {
    expect(deriveInvoiceStatus(1, 1)).toBe('Lunas');
    expect(deriveInvoiceStatus(1_000_000, 999_999)).toBe('Sudah Bayar Sebagian');
  });
});

describe('applyPayment', () => {
  it('cicilan: Sudah Bayar Sebagian, paid_date tetap kosong', () => {
    const s = applyPayment(base(), 400_000, '2026-10-15');
    expect(s).toEqual({ amount: 1_000_000, paidAmount: 400_000, paidDate: null });
    expect(deriveInvoiceStatus(s.amount, s.paidAmount)).toBe('Sudah Bayar Sebagian');
  });

  it('pelunasan lewat cicilan terakhir mengisi paid_date = tanggal bayar', () => {
    const s1 = applyPayment(base(), 400_000, '2026-10-01');
    const s2 = applyPayment(s1, 600_000, '2026-10-15');
    expect(s2.paidAmount).toBe(1_000_000);
    expect(s2.paidDate).toBe('2026-10-15');
  });

  it('kelebihan bayar diterima dan tetap Lunas; paid_date tidak bergeser', () => {
    const lunas = applyPayment(base(), 1_000_000, '2026-10-01');
    const lebih = applyPayment(lunas, 5_000, '2026-10-20');
    expect(lebih.paidAmount).toBe(1_005_000);
    expect(lebih.paidDate).toBe('2026-10-01');
  });

  it('menolak jumlah ≤ 0, pecahan, atau meluapi integer aman', () => {
    expect(() => applyPayment(base(), 0, '2026-10-15')).toThrow();
    expect(() => applyPayment(base(), -5, '2026-10-15')).toThrow();
    expect(() => applyPayment(base(), 10.5, '2026-10-15')).toThrow();
    expect(() =>
      applyPayment(base({ paidAmount: Number.MAX_SAFE_INTEGER }), 1, '2026-10-15'),
    ).toThrow();
  });
});

describe('applyMarkPaid', () => {
  it('menyetel paid_amount = amount dan paid_date', () => {
    const s = applyMarkPaid(base({ paidAmount: 250_000 }), '2026-10-15');
    expect(s).toEqual({ amount: 1_000_000, paidAmount: 1_000_000, paidDate: '2026-10-15' });
  });

  it('tidak mengurangi pembayaran yang sudah melebihi jumlah', () => {
    const s = applyMarkPaid(base({ paidAmount: 1_200_000, paidDate: '2026-10-01' }), '2026-10-15');
    expect(s.paidAmount).toBe(1_200_000);
    expect(s.paidDate).toBe('2026-10-01');
  });
});

describe('applyAmountChange', () => {
  it('menaikkan jumlah pada invoice Lunas membuatnya Sudah Bayar Sebagian dan mengosongkan paid_date', () => {
    const s = applyAmountChange(
      base({ paidAmount: 1_000_000, paidDate: '2026-10-01' }),
      1_500_000,
      '2026-10-15',
    );
    expect(deriveInvoiceStatus(s.amount, s.paidAmount)).toBe('Sudah Bayar Sebagian');
    expect(s.paidDate).toBeNull();
  });

  it('menurunkan jumlah hingga ≤ paid_amount membuatnya Lunas dengan paid_date hari ini', () => {
    const s = applyAmountChange(base({ paidAmount: 600_000 }), 600_000, '2026-10-15');
    expect(deriveInvoiceStatus(s.amount, s.paidAmount)).toBe('Lunas');
    expect(s.paidDate).toBe('2026-10-15');
  });
});
