/** Kelola honor satu perkara (Admin): draft, distribusi, status Dibayar. */
import { notFound } from 'next/navigation';
import { ensureCan, isAppError } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { getHonorOverview } from '@ekasatra/core/honor-tim';
import { Badge } from '@/components/ui/badge';
import { FileHeader } from '@/components/ui/file-header';
import { FigureStrip } from '@/components/ui/figure-strip';
import type { FigureItem } from '@/components/ui/figure-strip';
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

  const figures: FigureItem[] = [
    { label: 'Total tagihan', value: formatRupiah(o.totalBilled) },
    { label: `Kas kantor (${o.kasPersen}%)`, value: formatRupiah(o.kas) },
    { label: 'Dana distribusi', value: formatRupiah(o.fund) },
    { label: 'Terdistribusi', value: formatRupiah(o.publishedTotal) },
  ];

  return (
    <div>
      <FileHeader
        back={{ href: '/honor-tim', label: 'Honor Tim' }}
        reference={o.case.regNo}
        status={<Badge tone="info">{o.state}</Badge>}
        title={o.case.title}
      />

      <div className="mb-6">
        <FigureStrip label="Ringkasan honor perkara" items={figures} />
      </div>

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
