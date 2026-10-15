/**
 * GET /api/v1/invoices/:id/pdf?type=invoice|receipt — PDF invoice / kuitansi (Admin).
 * Kop dari Pengaturan (nama, alamat, kontak, logo di bucket `settings`).
 */
import { ensureCan, requireUser, toAppError, toErrPayload } from '@ekasatra/core';
import { getFinanceSettings, uuidParam } from '@ekasatra/core/finance';
import { getInvoice } from '@ekasatra/core/invoices';
import { createSupabaseServiceClient } from '@ekasatra/db';
import { validationError } from '@ekasatra/shared';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDb, type RouteParams } from '@/modules/invoices/route-ctx';
import {
  renderInvoicePdf,
  renderReceiptPdf,
  type Letterhead,
} from '@/modules/invoices/pdf/documents';

export const runtime = 'nodejs';

/** Logo opsional: gagal unduh / format tak didukung → kop tanpa logo, PDF tetap jadi. */
async function loadLogo(path: string): Promise<Letterhead['logo']> {
  const ext = path.split('.').pop()?.toLowerCase();
  const format = ext === 'png' ? 'png' : ext === 'jpg' || ext === 'jpeg' ? 'jpg' : null;
  if (!path || !format) return null;
  try {
    const { data } = await createSupabaseServiceClient().storage.from('settings').download(path);
    return data ? { data: Buffer.from(await data.arrayBuffer()), format } : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: RouteParams<'id'>) {
  try {
    const id = uuidParam((await params).id);
    const type = new URL(req.url).searchParams.get('type') ?? 'invoice';
    if (type !== 'invoice' && type !== 'receipt')
      throw validationError('type harus invoice atau receipt');

    const db = getDb();
    const user = await requireUser(db, await createSupabaseServerClient());
    ensureCan(user, 'R', 'invoices');
    const [inv, settings] = await Promise.all([getInvoice(db, user, id), getFinanceSettings(db)]);
    if (type === 'receipt' && inv.paidAmount <= 0) {
      throw validationError('Belum ada pembayaran untuk dibuatkan kuitansi');
    }

    const lh: Letterhead = {
      ...settings.office,
      logo: await loadLogo(settings.office.logoPath),
    };
    const data = {
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      paidDate: inv.paidDate,
      description: inv.description,
      amount: inv.amount,
      paidAmount: inv.paidAmount,
      status: inv.status,
      clientName: inv.clientName,
      caseLabel: inv.caseRegNo ? `${inv.caseRegNo} · ${inv.caseTitle}` : null,
    };
    const pdf = await (type === 'invoice'
      ? renderInvoicePdf(lh, data)
      : renderReceiptPdf(lh, data));

    const filename = `${type === 'invoice' ? 'Invoice' : 'Kuitansi'}-${inv.invoiceNo.replaceAll('/', '-')}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return Response.json(toErrPayload(err), { status: toAppError(err).status });
  }
}
