import { describe, expect, it, vi } from 'vitest';
import {
  getCasesReport,
  getSuratMasukReport,
  getSuratKeluarReport,
  getHonorariumReport,
  getSchedulesReport,
  exportToCsv,
} from '../src/reports';

describe('Laporan Admin (G2 & PRD §5.11)', () => {
  it('menolak akses ke laporan untuk role non-Admin', async () => {
    const fakeDb = {} as any;
    const nonAdmin = { role: 'Advokat' };

    await expect(getCasesReport(fakeDb, nonAdmin)).rejects.toThrow(/Akses ditolak/);
    await expect(getSuratMasukReport(fakeDb, nonAdmin)).rejects.toThrow(/Akses ditolak/);
    await expect(getSuratKeluarReport(fakeDb, nonAdmin)).rejects.toThrow(/Akses ditolak/);
    await expect(getHonorariumReport(fakeDb, nonAdmin)).rejects.toThrow(/Akses ditolak/);
    await expect(getSchedulesReport(fakeDb, nonAdmin)).rejects.toThrow(/Akses ditolak/);
  });

  it('mengizinkan akses ke laporan untuk role Admin', async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'c-1',
                regNo: 'REG/2026/0001',
                title: 'Perkara Uji',
                clientName: 'PT Maju',
                status: 'Aktif',
              },
            ]),
          }),
        }),
      }),
    } as any;

    const admin = { role: 'Admin' };
    const items = await getCasesReport(fakeDb, admin);
    expect(items.length).toBe(1);
    expect(items[0]?.regNo).toBe('REG/2026/0001');
  });

  it('exportToCsv menghasilkan CSV standar RFC 4180 dengan UTF-8 BOM', () => {
    const headers = [
      { key: 'no', label: 'No.' },
      { key: 'title', label: 'Judul Perkara' },
      { key: 'amount', label: 'Nilai (Rp)' },
    ];
    const data = [
      { no: '1', title: 'Sengketa "Tanah" & Bangunan', amount: 50000000 },
      { no: '2', title: 'Perkara Biasa', amount: 10000000 },
    ];

    const csv = exportToCsv(headers, data);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"No.","Judul Perkara","Nilai (Rp)"');
    expect(csv).toContain('"Sengketa ""Tanah"" & Bangunan"');
  });
});

