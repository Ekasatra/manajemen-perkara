import { describe, expect, it } from 'vitest';
import { createInvoiceSchema, recordPaymentSchema } from '../src/invoices';
import { saveHonorDraftSchema } from '../src/honor-tim';

const uuid = '3f0c2a52-6c5e-4f1a-8d57-0f1e9d6a1b11';

describe('createInvoiceSchema', () => {
  it('butuh klien atau perkara', () => {
    expect(createInvoiceSchema.safeParse({ amount: 1000 }).success).toBe(false);
    expect(createInvoiceSchema.safeParse({ amount: 1000, clientId: uuid }).success).toBe(true);
    expect(createInvoiceSchema.safeParse({ amount: 1000, caseId: uuid }).success).toBe(true);
  });

  it('menolak jumlah 0, negatif, atau pecahan', () => {
    for (const amount of [0, -1, 10.5]) {
      expect(createInvoiceSchema.safeParse({ amount, clientId: uuid }).success).toBe(false);
    }
  });

  it('status tidak bisa diisi klien (diabaikan)', () => {
    const r = createInvoiceSchema.parse({ amount: 1000, clientId: uuid, status: 'Lunas' });
    expect('status' in r).toBe(false);
  });
});

describe('recordPaymentSchema', () => {
  it('jumlah wajib integer > 0', () => {
    expect(recordPaymentSchema.safeParse({ amount: 1 }).success).toBe(true);
    expect(recordPaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ amount: 1.5 }).success).toBe(false);
  });
});

describe('saveHonorDraftSchema', () => {
  it('0 boleh, negatif & pecahan ditolak', () => {
    const ok = (amount: number) =>
      saveHonorDraftSchema.safeParse({ items: [{ userId: uuid, amount }] }).success;
    expect(ok(0)).toBe(true);
    expect(ok(-1)).toBe(false);
    expect(ok(0.5)).toBe(false);
  });
});
