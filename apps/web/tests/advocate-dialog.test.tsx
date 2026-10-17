/**
 * W2.4 / R6 — Data Advokat: nama jadi tombol pembuka dialog read-only, dan
 * tombol Ubah/Hapus hanya dirender bila role memang berhak (R7).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { AdvocateDetailDialog } from '@/modules/advocates/advocate-detail-dialog';
import { AdvocateActions } from '@/modules/advocates/advocate-actions';

const advocate = {
  id: 'adv-1',
  userId: 'user-1',
  fullName: 'Budi Santoso',
  address: 'Jl. Merdeka No. 1',
  phone: '0812-3456-7890',
  bankName: 'BCA',
  bankAccount: '1234567890',
  licenseNumber: 'KTA-2026-001',
  education: [{ level: 'S1', institution: 'Universitas Indonesia', year: '2010' }],
  trainings: [{ name: 'Litigasi Perdata', organizer: 'PERADI', year: '2015' }],
  createdAt: new Date('2026-01-02T00:00:00Z'),
};

describe('AdvocateDetailDialog (R6, read-only)', () => {
  const html = renderToStaticMarkup(<AdvocateDetailDialog advocate={advocate} />);

  it('nama dirender sebagai tombol yang membuka dialog', () => {
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('<dialog');
    expect(html).toContain('aria-labelledby');
  });

  it('dialog memuat seluruh data advokat', () => {
    for (const label of [
      'Nama Lengkap',
      'No. KTA',
      'Telepon',
      'Nama Bank',
      'Nomor Rekening',
      'Alamat',
      'Pendidikan',
      'Pelatihan',
      'Terdaftar',
    ]) {
      expect(html, label).toContain(label);
    }
    expect(html).toContain('KTA-2026-001');
    expect(html).toContain('S1 · Universitas Indonesia · 2010');
    expect(html).toContain('Litigasi Perdata · PERADI · 2015');
  });

  it('tidak ada aksi ubah/hapus/tambah di dalam dialog', () => {
    expect(html).not.toContain('Ubah');
    expect(html).not.toContain('Hapus');
    expect(html).not.toContain('Tambah');
  });
});

const row = {
  id: 'adv-1',
  fullName: 'Budi Santoso',
  address: 'Jl. Merdeka No. 1',
  phone: '0812',
  bankName: null,
  bankAccount: '123',
  licenseNumber: null,
  education: [],
};

describe('AdvocateActions — tombol aksi hanya bila berhak (R7)', () => {
  it('tanpa izin (Advokat/Paralegal): tidak ada tombol Ubah/Hapus', () => {
    const html = renderToStaticMarkup(
      <AdvocateActions row={row} canEdit={false} canDelete={false} />,
    );
    expect(html).not.toContain('Ubah');
    expect(html).not.toContain('Hapus');
  });

  it('Admin (boleh ubah, tak boleh hapus): hanya Ubah', () => {
    const html = renderToStaticMarkup(<AdvocateActions row={row} canEdit canDelete={false} />);
    expect(html).toContain('Ubah');
    expect(html).not.toContain('Hapus');
  });

  it('SuperAdmin: Ubah dan Hapus', () => {
    const html = renderToStaticMarkup(<AdvocateActions row={row} canEdit canDelete />);
    expect(html).toContain('Ubah');
    expect(html).toContain('Hapus');
  });
});
