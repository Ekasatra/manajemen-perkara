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
import { updateSettingsSchema } from '../src/settings';

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
      const r = createUserSchema.safeParse({ email: 'a@b.com', fullName: 'X', role, password: '12345678' });
      expect(r.success).toBe(true);
    }
  });
  it('menolak role tidak valid', () => {
    const r = createUserSchema.safeParse({ email: 'a@b.com', fullName: 'X', role: 'Hacker', password: '12345678' });
    expect(r.success).toBe(false);
  });
  it('menolak password < 8', () => {
    const r = createUserSchema.safeParse({ email: 'a@b.com', fullName: 'X', role: 'Admin', password: '123' });
    expect(r.success).toBe(false);
  });
});

describe('C3 Clients — contactSchema & contactsSchema', () => {
  it('menerima kontak dengan tipe valid', () => {
    const r = contactSchema.safeParse({ type: 'HP', value: '08123456789' });
    expect(r.success).toBe(true);
  });
  it('menolak tipe tidak valid', () => {
    const r = contactSchema.safeParse({ type: 'Twitter', value: '@user' });
    expect(r.success).toBe(false);
  });
  it('contactsSchema menolak lebih dari 20 kontak', () => {
    const contacts = Array.from({ length: 21 }, (_, i) => ({ type: 'HP', value: String(i) }));
    const r = contactsSchema.safeParse(contacts);
    expect(r.success).toBe(false);
  });
  it('contactsSchema menerima tepat 20 kontak', () => {
    const contacts = Array.from({ length: 20 }, (_, i) => ({ type: 'HP', value: String(i) }));
    const r = contactsSchema.safeParse(contacts);
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
