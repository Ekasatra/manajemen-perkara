'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Copy, ExternalLink, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import { CaseStatusBadge } from '@/modules/cases/case-status-badge';
import { FactList } from '@/components/ui/fact-list';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass } from '@/components/ui/styles';
import { formatDate } from '@/lib/format';
import type { Contact } from '@/lib/contacts';
import { useToast } from '@/shell/toast';

const TABS = ['Profil', 'Perkara Klien', 'Portal Klien'] as const;
type Tab = (typeof TABS)[number];

type CaseItem = { id: string; regNo: string; title: string; status: string; court: string | null };

export function ClientDetailTabs({
  clientId,
  profile,
  cases,
  portal,
  canCreateCase,
  canRegenerate,
}: {
  clientId: string;
  profile: { address: string | null; notes: string | null; createdAt: string; contacts: Contact[] };
  cases: CaseItem[];
  portal: { url: string; enabled: boolean; phone: string | null; name: string };
  canCreateCase: boolean;
  canRegenerate: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('Profil');
  const [url, setUrl] = useState(portal.url);
  const [confirm, setConfirm] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Tautan portal disalin.');
    } catch {
      toast.show('Salin tautan secara manual dari kolom.', 'info');
    }
  }

  async function regenerate() {
    const res = await fetch(`/api/v1/clients/${clientId}/regenerate-token`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat ulang tautan');
    setUrl(url.replace(/[^/]+$/, data.data.portalToken));
    setConfirm(false);
    toast.show('Tautan baru dibuat.');
    router.refresh();
  }

  const wa = portal.phone
    ? `https://wa.me/${portal.phone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
        `Yth. ${portal.name}, berikut tautan portal klien EKASATRA untuk memantau perkara Anda: ${url}`,
      )}`
    : null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Rincian klien"
        className="mb-4 flex w-full gap-1 overflow-x-auto rounded-control border border-navy-100 bg-surface/60 p-1 sm:w-fit"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition md:min-h-9 ${
              tab === t
                ? 'bg-surface text-navy-800 shadow-soft'
                : 'text-navy-500 hover:bg-surface/70'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profil' ? (
        <FactList
          rows={[
            ['Terdaftar', formatDate(profile.createdAt)],
            [
              'Kontak',
              profile.contacts.length ? (
                <ul key="c" className="space-y-0.5">
                  {profile.contacts.map((c, i) => (
                    <li key={i}>
                      <span className="text-navy-400">{c.type}:</span> {c.value}
                    </li>
                  ))}
                </ul>
              ) : (
                '—'
              ),
            ],
            ['Alamat', profile.address ?? '—'],
            ['Catatan', profile.notes ?? '—'],
          ]}
        />
      ) : null}

      {tab === 'Perkara Klien' ? (
        <div className="card-surface p-5">
          {cases.length === 0 ? (
            <p className="flex flex-col items-center gap-2 py-8 text-sm text-navy-400">
              <Briefcase aria-hidden="true" size={28} className="text-navy-300" />
              Klien belum memiliki perkara
            </p>
          ) : (
            <ul className="space-y-2">
              {cases.map((k) => (
                <li key={k.id}>
                  <Link
                    href={`/cases/${k.id}`}
                    className="flex items-center gap-3 rounded-control border border-navy-50 p-3 hover:bg-gold-50/40"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-navy-700 text-gold-300 dark:bg-gold-500 dark:text-navy-950">
                      <Briefcase aria-hidden="true" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy-800">
                        {k.title}
                      </span>
                      <span className="block text-xs text-navy-400">
                        {k.regNo}
                        {k.court ? ` · ${k.court}` : ''}
                      </span>
                    </span>
                    <CaseStatusBadge status={k.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {canCreateCase ? (
            <Link
              href="/cases"
              className={`${buttonClass.secondary} mt-4 min-h-9 px-3 py-1.5 text-xs`}
            >
              <Plus aria-hidden="true" size={14} /> Registrasi perkara untuk klien ini
            </Link>
          ) : null}
        </div>
      ) : null}

      {tab === 'Portal Klien' ? (
        <div className="card-surface space-y-4 p-5">
          <p className="text-sm text-navy-600">
            Tautan agar klien dapat melihat status perkara, jadwal sidang, ringkasan biaya, dan
            dokumen yang dibagikan (hanya-baca, tanpa login).
          </p>
          {!portal.enabled ? (
            <p className="rounded-control bg-warning-bg p-3 text-sm text-warning-fg">
              Portal sedang dinonaktifkan untuk klien ini.
            </p>
          ) : null}
          <div className="flex gap-2">
            <label htmlFor="portal-url" className="sr-only">
              Tautan portal
            </label>
            <input
              id="portal-url"
              readOnly
              value={url}
              className="block min-h-11 w-full rounded-control border border-navy-200 bg-surface/80 px-3.5 py-2.5 font-mono text-xs text-navy-800 md:min-h-10"
            />
            <button
              type="button"
              onClick={copy}
              aria-label="Salin tautan"
              className={buttonClass.primary}
            >
              <Copy aria-hidden="true" size={15} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonClass.secondary} min-h-9 px-3 py-1.5 text-xs`}
            >
              <ExternalLink aria-hidden="true" size={14} /> Buka portal
            </a>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonClass.secondary} min-h-9 px-3 py-1.5 text-xs`}
              >
                <MessageCircle aria-hidden="true" size={14} /> Kirim via WhatsApp
              </a>
            ) : null}
            {canRegenerate ? (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className={`${buttonClass.softDanger} min-h-9 px-3 py-1.5 text-xs`}
              >
                <RefreshCw aria-hidden="true" size={14} /> Buat ulang tautan
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-navy-400">
            Membuat ulang tautan akan membatalkan tautan lama.
          </p>
        </div>
      ) : null}

      <FormDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Buat ulang tautan portal?"
        description="Tautan lama tidak berlaku lagi. Tindakan ini tercatat di Audit Log."
        submitLabel="Buat ulang"
        destructive
        onSubmit={regenerate}
      >
        <span />
      </FormDialog>
    </div>
  );
}
