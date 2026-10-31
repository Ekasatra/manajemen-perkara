import { StaffPage } from '@/modules/advocates/staff-page';
import type { SearchParams } from '@/lib/pagination';

export default function AdvocatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <StaffPage kind="Advokat" searchParams={searchParams} />;
}
