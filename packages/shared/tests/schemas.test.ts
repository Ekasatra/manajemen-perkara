/**
 * Tes skema validasi modul C (Agent C).
 * Menguji aturan bisnis PRD §5.1–5.5 yang ditegakkan oleh zod.
 */
import { describe, expect, it } from 'vitest';
import { loginSchema, setupSchema } from '../src/auth';
import { createUserSchema } from '../src/users';
import { createClientSchema, contactsSchema, contactSchema } from '../src/clients';
import { createOpponentSchema } from '../src/opponents';
import { createAdvocateSchema, educationSchema } from '../src/advocates';
import { INVOICE_STATUSES, listInvoicesQuerySchema } from '../src/invoices';
import { updateSettingsSchema } from '../src/settings';
import { changeCaseStatusSchema } from '../src/cases';

describe('D3 Cases — changeCaseStatusSchema (W8 R9)', () => {
  it('menerima status tanpa alasan', () => {
    const r = changeCaseStatusSchema.safeParse({ status: 'Selesai' });
    expect(r.success).toBe(true);
  });
  it('menerima status + alasan opsional', () => {
    const r = changeCaseStatusSchema.safeParse({ status: 'Selesai', reason: 'Koreksi data' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBe('Koreksi data');
  });
  it('memotong (trim) alasan dan menerima string kosong sebagai undefined', () => {
    const r = changeCaseStatusSchema.safeParse({ status: 'Putus', reason: '  ' });
    expect(r.success).toBe(true);
  });
  it('menolak status tidak valid', () => {
    const r = changeCaseStatusSchema.safeParse({ status: 'Dibatalkan' });
    expect(r.success).toBe(false);
  });
  it('menolak alasan > 500 karakter', () => {
    const r = changeCaseStatusSchema.safeParse({ status: 'Selesai', reason: 'x'.repeat(501) });
    expect(r.success).toBe(false);
  });
});

describe('C1 Auth — loginSchema', () => {
  it('menerima email + password 8 karakter', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: '12345678' });
    expect(r.success).toBe(true);
  });
  it('menerima password pendek (akun lama) dan menolak yang kosong', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'qwerty' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
  it('menolak email tidak valid', () => {
    const r = loginSchema.safeParse({ email: 'bukan-email', password: '12345678' });
    expect(r.success).toBe(false);
  });
});

describe('C1 Auth — setupSchema', () => {
  it('menerima fullName, email, password valid', () => {
    const r = setupSchema.safeParse({ fullName: 'Admin', email: 'a@b.com', password: '12345678' });
    expect(r.success).toBe(true);
  });
  it('menolak fullName kosong', () => {
    const r = setupSchema.safeParse({ fullName: '', email: 'a@b.com', password: '12345678' });
    expect(r.success).toBe(false);
  });
});

describe('C2 Users — createUserSchema', () => {
  it('menerima role Admin/Advokat/Paralegal', () => {
    for (const role of ['Admin', 'Advokat', 'Paralegal']) {
      const r = createUserSchema.safeParse({
        email: 'a@b.com',
        fullName: 'X',
        role,
        password: '12345678',
      });
      expect(r.success).toBe(true);
    }
  });
  it('menolak role tidak valid', () => {
    const r = createUserSchema.safeParse({
      email: 'a@b.com',
      fullName: 'X',
      role: 'Hacker',
      password: '12345678',
    });
    expect(r.success).toBe(false);
  });
  it('menolak password < 8', () => {
    const r = createUserSchema.safeParse({
      email: 'a@b.com',
      fullName: 'X',
      role: 'Admin',
      password: '123',
    });
    expect(r.success).toBe(false);
  });
});

describe('C3 Clients — contactSchema & contactsSchema', () => {
  it('menerima kontak telepon valid', () => {
    const r = contactSchema.safeParse({ kind: 'phone', value: '08123456789', isPrimary: true });
    expect(r.success).toBe(true);
  });
  it('menerima kontak email valid', () => {
    const r = contactSchema.safeParse({ kind: 'email', value: 'a@b.com', isPrimary: true });
    expect(r.success).toBe(true);
  });
  it('menolak email tidak valid', () => {
    const r = contactSchema.safeParse({ kind: 'email', value: 'bukan-email', isPrimary: true });
    expect(r.success).toBe(false);
  });
  it('menolak telepon tidak valid', () => {
    const r = contactSchema.safeParse({ kind: 'phone', value: 'abc', isPrimary: true });
    expect(r.success).toBe(false);
  });
  it('menolak kind tidak valid', () => {
    const r = contactSchema.safeParse({ kind: 'fax', value: '08123456789', isPrimary: true });
    expect(r.success).toBe(false);
  });
  it('contactsSchema menolak lebih dari 20 kontak', () => {
    const contacts = Array.from({ length: 21 }, (_, i) => ({
      kind: 'phone' as const,
      value: `081234567${String(i).padStart(2, '0')}`,
      isPrimary: i === 0,
    }));
    const r = contactsSchema.safeParse(contacts);
    expect(r.success).toBe(false);
  });
  it('contactsSchema menerima tepat 20 kontak (1 primary per jenis)', () => {
    const phones = Array.from({ length: 10 }, (_, i) => ({
      kind: 'phone' as const,
      value: `081234567${String(i).padStart(2, '0')}`,
      isPrimary: i === 0,
    }));
    const emails = Array.from({ length: 10 }, (_, i) => ({
      kind: 'email' as const,
      value: `user${i}@example.com`,
      isPrimary: i === 0,
    }));
    const r = contactsSchema.safeParse([...phones, ...emails]);
    expect(r.success).toBe(true);
  });
  it('menolak duplikat kind+value', () => {
    const r = contactsSchema.safeParse([
      { kind: 'phone', value: '08123456789', isPrimary: true },
      { kind: 'phone', value: '08123456789', isPrimary: false },
    ]);
    expect(r.success).toBe(false);
  });
  it('menolak lebih dari satu primary per jenis', () => {
    const r = contactsSchema.safeParse([
      { kind: 'phone', value: '08123456789', isPrimary: true },
      { kind: 'phone', value: '08123456790', isPrimary: true },
    ]);
    expect(r.success).toBe(false);
  });
  it('menolak nol primary bila ada kontak jenis tersebut', () => {
    const r = contactsSchema.safeParse([
      { kind: 'phone', value: '08123456789', isPrimary: false },
      { kind: 'phone', value: '08123456790', isPrimary: false },
    ]);
    expect(r.success).toBe(false);
  });
  it('menerima kontak kosong', () => {
    const r = contactsSchema.safeParse([]);
    expect(r.success).toBe(true);
  });
});

describe('C3 Clients — createClientSchema', () => {
  it('nama wajib', () => {
    const r = createClientSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });
  it('contacts default [] bila tidak diisi', () => {
    const r = createClientSchema.safeParse({ name: 'Klien A' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contacts).toEqual([]);
  });
});

describe('C4 Opponents — createOpponentSchema', () => {
  it('nama wajib', () => {
    const r = createOpponentSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });
  it('menerima data valid', () => {
    const r = createOpponentSchema.safeParse({ name: 'Lawan B', type: 'Perusahaan' });
    expect(r.success).toBe(true);
  });
});

describe('C5 Advocates — educationSchema', () => {
  it('wajib level dan institution', () => {
    const r = educationSchema.safeParse({ level: '', institution: '' });
    expect(r.success).toBe(false);
  });
  it('menerima dengan year opsional', () => {
    const r = educationSchema.safeParse({ level: 'S1', institution: 'UI' });
    expect(r.success).toBe(true);
  });
});

describe('C5 Advocates — createAdvocateSchema', () => {
  const validBase = {
    fullName: 'Andi',
    address: 'Jl. A',
    phone: '0812',
    bankAccount: '123456',
    education: [{ level: 'S1', institution: 'UI' }],
  };
  it('wajib: nama, alamat, telepon, rekening, pendidikan min 1', () => {
    const r = createAdvocateSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });
  it('menolak pendidikan kosong', () => {
    const r = createAdvocateSchema.safeParse({ ...validBase, education: [] });
    expect(r.success).toBe(false);
  });
  it('menolak tanpa bankAccount', () => {
    const r = createAdvocateSchema.safeParse({ ...validBase, bankAccount: '' });
    expect(r.success).toBe(false);
  });
});

describe('C6 Settings — updateSettingsSchema', () => {
  it('menerima update parsial', () => {
    const r = updateSettingsSchema.safeParse({ kas_kantor_persen: 25 });
    expect(r.success).toBe(true);
  });
  it('menolak kas_kantor_persen > 100', () => {
    const r = updateSettingsSchema.safeParse({ kas_kantor_persen: 150 });
    expect(r.success).toBe(false);
  });
  it('menolak kas_kantor_persen < 0', () => {
    const r = updateSettingsSchema.safeParse({ kas_kantor_persen: -5 });
    expect(r.success).toBe(false);
  });
});

describe('W5 Invoice — status turunan (PRD masukan §4 R4)', () => {
  it('memuat tepat tiga status dengan label "Sudah Bayar Sebagian"', () => {
    expect(INVOICE_STATUSES).toEqual(['Belum Bayar', 'Sudah Bayar Sebagian', 'Lunas']);
  });
  it('filter menerima label baru dan menolak nilai lama "Sebagian"', () => {
    expect(listInvoicesQuerySchema.safeParse({ status: 'Sudah Bayar Sebagian' }).success).toBe(
      true,
    );
    expect(listInvoicesQuerySchema.safeParse({ status: 'Sebagian' }).success).toBe(false);
  });
});
