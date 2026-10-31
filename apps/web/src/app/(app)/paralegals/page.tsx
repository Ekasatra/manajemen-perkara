import { StaffPage } from '@/modules/advocates/staff-page';
import type { SearchParams } from '@/lib/pagination';

export default function ParalegalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <StaffPage kind="Paralegal" searchParams={searchParams} />;
}
