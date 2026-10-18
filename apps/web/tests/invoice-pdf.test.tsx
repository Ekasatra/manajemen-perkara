// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  invoiceDocumentTitle,
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
  status: 'Sudah Bayar Sebagian',
  clientName: 'Klien Uji',
  caseLabel: 'REG/2026/0001 · Perkara Uji',
};

/** PNG 1x1 transparan: cukup untuk menguji jalur logo unggahan tanpa berkas nyata. */
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function isPdf(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString() === '%PDF-' && buf.length > 1000;
}

describe('PDF invoice & kuitansi', () => {
  it('invoice menghasilkan PDF valid', async () => {
    expect(isPdf(await renderInvoicePdf(lh, inv))).toBe(true);
  });

  it('tiga status + pembayaran melebihi total menghasilkan PDF valid', async () => {
    const belum: PdfInvoice = { ...inv, paidAmount: 0, status: 'Belum Bayar' };
    const sebagian: PdfInvoice = {
      ...inv,
      paidAmount: 1_000_000,
      status: 'Sudah Bayar Sebagian',
    };
    const lunas: PdfInvoice = {
      ...inv,
      paidAmount: inv.amount,
      status: 'Lunas',
      paidDate: '2026-10-20',
    };
    const lebih: PdfInvoice = {
      ...inv,
      paidAmount: inv.amount + 500_000,
      status: 'Lunas',
      paidDate: '2026-10-20',
    };
    for (const data of [belum, sebagian, lunas, lebih]) {
      expect(isPdf(await renderInvoicePdf(lh, data))).toBe(true);
    }
  });

  it('judul dokumen "INVOICE" kecuali Lunas → "TANDA TERIMA"', () => {
    expect(invoiceDocumentTitle('Belum Bayar')).toBe('INVOICE');
    expect(invoiceDocumentTitle('Sudah Bayar Sebagian')).toBe('INVOICE');
    expect(invoiceDocumentTitle('Lunas')).toBe('TANDA TERIMA');
  });

  it('kop tanpa logo unggahan memakai penanda merek; dengan unggahan memakai gambar', async () => {
    const withUpload = await renderInvoicePdf(
      { ...lh, logo: { data: PNG_1x1, format: 'png' } },
      inv,
    );
    expect(isPdf(withUpload)).toBe(true);
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
