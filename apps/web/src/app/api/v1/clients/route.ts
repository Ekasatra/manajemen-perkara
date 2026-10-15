/**
 * GET  /api/v1/clients — daftar klien (Admin only) (Agent C · C3)
 * POST /api/v1/clients — buat klien dengan kode KL- otomatis
 */
import { count, desc, ilike } from 'drizzle-orm';
import { createDb, clients } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  nextCounter,
  withTx,
  logActivity,
} from '@ekasatra/core';
import { createClientSchema } from '@ekasatra/shared';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';

export async function GET(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'clients');

    const url = new URL(req.url);
    const params: SearchParams = Object.fromEntries(url.searchParams.entries());
    const { page, pageSize, offset } = parsePageQuery(params);
    const q = url.searchParams.get('q');

    const baseQuery = q
      ? db
          .select({
            id: clients.id,
            clientCode: clients.clientCode,
            name: clients.name,
            type: clients.type,
            phone: clients.phone,
            email: clients.email,
            portalEnabled: clients.portalEnabled,
            createdAt: clients.createdAt,
          })
          .from(clients)
          .where(ilike(clients.name, `%${q}%`))
      : db
          .select({
            id: clients.id,
            clientCode: clients.clientCode,
            name: clients.name,
            type: clients.type,
            phone: clients.phone,
            email: clients.email,
            portalEnabled: clients.portalEnabled,
            createdAt: clients.createdAt,
          })
          .from(clients);

    const [rows, countRows] = await Promise.all([
      baseQuery.orderBy(desc(clients.createdAt)).limit(pageSize).offset(offset),
      db.select({ value: count() }).from(clients),
    ]);

    const total = countRows[0]?.value ?? 0;

    return ok({ rows, page, pageSize, total });
  });
}

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'C', 'clients');

    const body = await parseBody(req, createClientSchema);

    // Buat kode KL- dalam transaksi (counter + insert atomik).
    const [client] = await withTx(db, async (tx) => {
      const counter = await nextCounter(tx, 'KL');
      const clientCode = `KL-${String(counter).padStart(4, '0')}`;

      // Turunkan phone/email dari kontak.
      const phoneContact = body.contacts.find((c) =>
        ['HP', 'WhatsApp', 'Telepon'].includes(c.type),
      );
      const emailContact = body.contacts.find((c) => c.type === 'Email');

      return tx
        .insert(clients)
        .values({
          clientCode,
          name: body.name,
          type: body.type ?? null,
          contacts: body.contacts,
          phone: phoneContact?.value ?? null,
          email: emailContact?.value ?? null,
          address: body.address ?? null,
          notes: body.notes ?? null,
          portalEnabled: body.portalEnabled,
          createdBy: user.userId,
        })
        .returning();
    });

    if (!client) throw new Error('Gagal membuat klien');

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'create',
      module: 'clients',
      entityType: 'client',
      entityId: client.id,
      description: `Buat klien ${client.name} (${client.clientCode})`,
    });

    return ok(client);
  });
}
