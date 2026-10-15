import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from '../src/surat/deps';
import { createSuratKeluarSchema, createSuratMasukSchema } from '../src/surat/schemas';
import { MAX_FILE_BYTES, ownsPath, validateUpload } from '../src/surat/storage';

const base = {
  noSurat: ' 001/EKS/X/2026 ',
  tglSurat: '2026-10-15',
  kepada: 'PN Jakarta',
  perihal: 'Permohonan',
  filePath: 'keluar/u1/abc/surat.pdf',
};

describe('createSuratKeluarSchema', () => {
  it('jenis Perkara wajib caseId', () => {
    expect(createSuratKeluarSchema.safeParse({ ...base, jenis: 'Perkara' }).success).toBe(false);
    const ok = createSuratKeluarSchema.safeParse({
      ...base,
      jenis: 'Perkara',
      caseId: '6f1c2a9e-1b7d-4f5a-9d52-0a3b1c2d4e5f',
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.noSurat).toBe('001/EKS/X/2026'); // di-trim
  });

  it('jenis Instansi tanpa perkara valid; file wajib', () => {
    expect(createSuratKeluarSchema.safeParse({ ...base, jenis: 'Instansi' }).success).toBe(true);
    const { filePath: _f, ...noFile } = base;
    expect(createSuratKeluarSchema.safeParse({ ...noFile, jenis: 'Instansi' }).success).toBe(false);
  });
});

describe('createSuratMasukSchema', () => {
  it('pengirim & perihal wajib, sifat default Biasa', () => {
    expect(createSuratMasukSchema.safeParse({ sender: 'A' }).success).toBe(false);
    const r = createSuratMasukSchema.parse({ sender: 'A', subject: 'B' });
    expect(r.sifat).toBe('Biasa');
  });
});

describe('storage', () => {
  it('menolak tipe & ukuran terlarang', () => {
    expect(() => validateUpload({ name: 'a.exe', size: 10 })).toThrow();
    expect(() => validateUpload({ name: 'noext', size: 10 })).toThrow();
    expect(() => validateUpload({ name: 'a.pdf', size: 0 })).toThrow();
    expect(() => validateUpload({ name: 'a.pdf', size: MAX_FILE_BYTES + 1 })).toThrow();
    expect(validateUpload({ name: '../../etc/Surat Kuasa.PDF', size: 10 })).toBe('Surat Kuasa.PDF');
  });

  it('path hanya milik user sendiri', () => {
    expect(ownsPath('keluar/u1/x/a.pdf', 'keluar', 'u1')).toBe(true);
    expect(ownsPath('keluar/u2/x/a.pdf', 'keluar', 'u1')).toBe(false);
    expect(ownsPath('case-documents/u1/x/a.pdf', 'keluar', 'u1')).toBe(false);
    expect(ownsPath('keluar/u1/../u2/a.pdf', 'keluar', 'u1')).toBe(false);
  });
});

describe('isUniqueViolation', () => {
  it('mengenali 23505 langsung maupun lewat cause', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ cause: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation(new Error('x'))).toBe(false);
  });
});
