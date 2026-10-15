/* eslint-disable @typescript-eslint/no-explicit-any -- mock Drizzle/transport */
import { describe, expect, it, vi } from 'vitest';
import { getDashboardData } from '../src/dashboard';

function makeMockChain(result: any = []) {
  const p = Promise.resolve(result);
  const chain: any = {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
  };
  return chain;
}

describe('Dashboard (G1 & G6 & PRD §5.10)', () => {
  it('menyembunyikan rincian piutang untuk role non-Admin yang tidak berhak', async () => {
    const fakeDb = {
      select: vi.fn(() => ({
        from: vi.fn(() => makeMockChain([])),
      })),
    } as any;

    const advocateUser = {
      userId: '11111111-1111-1111-1111-111111111111',
      role: 'Advokat',
    };

    const data = await getDashboardData(fakeDb, advocateUser);
    expect(data.piutang.authorized).toBe(false);
    expect(data.piutang.totalOutstanding).toBeNull();
  });

  it('menampilkan ringkasan piutang untuk Admin', async () => {
    const fakeDb = {
      select: vi.fn((fields: any) => ({
        from: vi.fn(() => {
          if (fields && fields.totalAmount !== undefined) {
            return makeMockChain([
              { count: 3, totalAmount: 150000000, paidAmount: 50000000 },
            ]);
          }
          return makeMockChain([]);
        }),
      })),
    } as any;

    const adminUser = {
      userId: '22222222-2222-2222-2222-222222222222',
      role: 'Admin',
    };

    const data = await getDashboardData(fakeDb, adminUser);
    expect(data.piutang.authorized).toBe(true);
    expect(data.piutang.totalOutstanding).toBe(100000000);
    expect(data.piutang.invoiceCount).toBe(3);
  });
});

