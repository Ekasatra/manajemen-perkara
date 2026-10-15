/**
 * GET  /api/v1/invoices — daftar (filter status/klien/perkara/tanggal, paginasi server)
 * POST /api/v1/invoices — buat invoice `INV/{tahun}/{0001}` (Admin)
 */
import { parseBody } from '@ekasatra/core';
import { parseQuery } from '@ekasatra/core/finance';
import { createInvoice, listInvoices } from '@ekasatra/core/invoices';
import { createInvoiceSchema, listInvoicesQuerySchema } from '@ekasatra/shared/invoices';
import { route } from '@/modules/invoices/route-ctx';

export function GET(req: Request) {
  return route(({ db, user }) => listInvoices(db, user, parseQuery(req, listInvoicesQuerySchema)));
}

export function POST(req: Request) {
  return route(async ({ db, user }) =>
    createInvoice(db, user, await parseBody(req, createInvoiceSchema)),
  );
}
