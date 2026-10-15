// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  renderInvoicePdf,
  renderReceiptPdf,
  type Letterhead,
  type PdfInvoice,
} from '@/modules/invoices/pdf/documents';

const lh: Letterhead = {
  name: 'EKASATRA Law & Policy Advisory',
  address: 'Jl. Contoh No. 1, Jakarta',
  phone: '021-000000',
  email: 'kantor@example.test',
  logo: null,
};

const inv: PdfInvoice = {
  invoiceNo: 'INV/2026/0001',
  invoiceDate: '2026-10-15',
  dueDate: '2026-11-15',
  paidDate: null,
  description: 'Jasa hukum tahap pertama',
  amount: 2_500_000,
  paidAmount: 1_000_000,
  status: 'Sebagian',
  clientName: 'Klien Uji',
  caseLabel: 'REG/2026/0001 · Perkara Uji',
};

describe('PDF invoice & kuitansi', () => {
  it('invoice menghasilkan PDF valid', async () => {
    const pdf = await renderInvoicePdf(lh, inv);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('kuitansi (pembayaran sebagian & lunas) menghasilkan PDF valid', async () => {
    const part = await renderReceiptPdf(lh, inv);
    const full = await renderReceiptPdf(lh, {
      ...inv,
      paidAmount: inv.amount,
      status: 'Lunas',
      paidDate: '2026-10-20',
    });
    for (const pdf of [part, full]) expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('kop kosong (setting belum diisi) tetap jadi PDF', async () => {
    const empty = { name: '', address: '', phone: '', email: '', logo: null };
    expect((await renderInvoicePdf(empty, inv)).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
