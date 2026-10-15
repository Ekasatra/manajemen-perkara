/** Kelola honor satu perkara (Admin): draft, distribusi, status Dibayar. */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ensureCan, isAppError } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { getHonorOverview } from '@ekasatra/core/honor-tim';
import { formatRupiah } from '@/lib/format';
import { HonorEditor } from '@/modules/honor-tim/honor-editor';
import { pageContext } from '@/modules/invoices/route-ctx';

export default async function HonorCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const { db, user } = await pageContext();
  ensureCan(user, 'U', 'honor_tim');

  let o;
  try {
    o = await getHonorOverview(db, user, uuidParam(caseId));
  } catch (e) {
    if (isAppError(e) && (e.code === 'NOT_FOUND' || e.code === 'VALIDATION_ERROR')) notFound();
    throw e;
  }

  const cards: [string, string][] = [
    ['Total tagihan', formatRupiah(o.totalBilled)],
    [`Kas kantor (${o.kasPersen}%)`, formatRupiah(o.kas)],
    ['Dana distribusi', formatRupiah(o.fund)],
    ['Terdistribusi', formatRupiah(o.publishedTotal)],
  ];

  return (
    <div>
      <p className="mb-1 text-sm">
        <Link href="/honor-tim" className="text-navy-600 underline">
          ← Honor &amp; Kas
        </Link>
      </p>
      <h1 className="text-2xl font-semibold text-navy-700">
        {o.case.regNo} · {o.case.title}
      </h1>
      <p className="mt-1 text-sm text-navy-600">State honor: {o.state}</p>

      <dl className="my-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-md border border-navy-100 p-3">
            <dt className="text-xs text-navy-500">{k}</dt>
            <dd className="mt-1 text-lg font-semibold text-navy-800">{v}</dd>
          </div>
        ))}
      </dl>

      {o.members.length === 0 ? (
        <p className="text-sm text-navy-700">
          Perkara ini belum memiliki anggota tim. Admin mengatur tim di halaman perkara.
        </p>
      ) : (
        <HonorEditor caseId={o.case.id} fund={o.fund} members={o.members} />
      )}
    </div>
  );
}
