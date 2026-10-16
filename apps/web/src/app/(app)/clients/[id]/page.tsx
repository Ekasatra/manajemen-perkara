/** Rincian klien gaya GAS: Profil, Perkara Klien, dan Portal Klien. */
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { createDb, clients } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { can, ensureCan, listCasesOfClient, requireUser } from '@ekasatra/core';
import { notFound } from '@ekasatra/shared';
import { FileHeader } from '@/components/ui/file-header';
import { asContacts, firstPhone } from '@/lib/contacts';
import { ClientDetailTabs } from '@/modules/clients/client-detail-tabs';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'clients');

  const [c] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!c) throw notFound('Klien tidak ditemukan');
  const caseRows = await listCasesOfClient(db, user, id);

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');

  return (
    <div>
      <FileHeader
        back={{ href: '/clients', label: 'Klien' }}
        reference={`${c.clientCode} · ${c.type ?? '-'}`}
        title={c.name}
      />
      <ClientDetailTabs
        clientId={c.id}
        profile={{
          address: c.address,
          notes: c.notes,
          createdAt: c.createdAt.toISOString(),
          contacts: asContacts(c.contacts).length
            ? asContacts(c.contacts)
            : [
                ...(c.phone ? [{ type: 'Telepon', value: c.phone }] : []),
                ...(c.email ? [{ type: 'Email', value: c.email }] : []),
              ],
        }}
        cases={caseRows}
        portal={{
          url: `${proto}://${host}/portal/${c.portalToken}`,
          enabled: c.portalEnabled,
          phone: firstPhone(c.contacts) ?? c.phone,
          name: c.name,
        }}
        canCreateCase={can(user, 'C', 'cases')}
        canRegenerate={can(user, 'U', 'clients')}
      />
    </div>
  );
}
