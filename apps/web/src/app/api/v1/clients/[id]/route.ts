/**
 * GET    /api/v1/clients/[id] — detail klien (Agent C · C3)
 * PATCH  /api/v1/clients/[id] — update klien
 * DELETE /api/v1/clients/[id] — hapus klien
 */
import { eq } from 'drizzle-orm';
import { createDb, clients, clientContacts } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  logActivity,
} from '@ekasatra/core';
import { notFound } from '@ekasatra/shared';
import { updateClientSchema } from '@ekasatra/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'clients');

    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!client) throw notFound('Klien tidak ditemukan');

    return ok(client);
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'clients');

    const body = await parseBody(req, updateClientSchema);

    // Turunkan phone/email dari kontak dan sinkronkan ke client_contacts.
    let updateData: Record<string, unknown> = { ...body };
    if (body.contacts) {
      const phoneContact = body.contacts.find((c) =>
        c.kind === 'phone',
      );
      const emailContact = body.contacts.find((c) => c.kind === 'email');
      updateData = {
        ...updateData,
        phone: phoneContact?.value ?? null,
        email: emailContact?.value ?? null,
      };

      // Hapus kontak lama lalu tulis ulang dari body.
      await db.delete(clientContacts).where(eq(clientContacts.clientId, id));
      if (body.contacts.length > 0)
        await db.insert(clientContacts).values(
        body.contacts.map((c, i) => ({
          clientId: id,
          kind: c.kind,
          value: c.value,
          label: c.label ?? null,
          isPrimary: c.isPrimary === true,
          position: c.position ?? i,
        })),
      );
    }

    const [updated] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
    if (!updated) throw notFound('Klien tidak ditemukan');

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: 'clients',
      entityType: 'client',
      entityId: id,
      description: `Update klien ${updated.name}`,
    });

    return ok(updated);
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'D', 'clients');

    const [target] = await db
      .select({ name: clients.name, clientCode: clients.clientCode })
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
    if (!target) throw notFound('Klien tidak ditemukan');

    await db.delete(clients).where(eq(clients.id, id));

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: 'clients',
      entityType: 'client',
      entityId: id,
      description: `Hapus klien ${target.name} (${target.clientCode})`,
    });

    return ok({ success: true });
  });
}
