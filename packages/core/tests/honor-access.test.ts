/**
 * W2.3 — Honor Tim ditegakkan di server (PRD-MASUKAN §4 R7/K3).
 *
 * Fungsi pengelolaan honor (Admin-only) wajib menolak Advokat/Paralegal dengan
 * FORBIDDEN 403 SEBELUM menyentuh DB, sehingga response tidak mungkin memuat
 * total biaya perkara/kas kantor untuk non-admin. Uji ini memakai stub DB yang
 * melempar bila diakses: lolosnya fungsi admin ke stub (bukan FORBIDDEN) jadi
 * bukti guard bergantung role, bukan penolakan menyeluruh.
 */
import { describe, expect, it } from 'vitest';
import {
  getHonorOverview,
  getKasSummary,
  listHonorCases,
  listMyHonor,
  publishHonor,
  saveHonorDraft,
  setHonorPaid,
} from '../src/honor-tim';
import type { AuthContext } from '../src/kernel/auth';
import type { DbExecutor } from '../src/kernel/db-helpers';

const CFG_FORBIDDEN = { code: 'FORBIDDEN', status: 403 };

function user(role: AuthContext['role']): AuthContext {
  return { userId: `u-${role}`, email: `${role}@ekasatra.test`, fullName: role, role, isActive: true };
}

const ADMIN_ONLY_ROLES: AuthContext['role'][] = ['advokat', 'paralegal'];
const ADMIN_ROLES: AuthContext['role'][] = ['admin', 'superadmin'];

/**
 * DB stub yang menolak setiap query dengan sentinel. Semua method builder
 * mengembalikan rantai yang sama, dan `await`/`transaction` melempar sentinel —
 * jadi fungsi admin yang lolos guard pasti menyentuh stub ini.
 */
const SENTINEL = 'DB_SENTINEL: tidak boleh diakses sebelum otorisasi';
function failingDb(message: string): DbExecutor {
  const chain: Record<string, unknown> = {};
  const asChain = () => chain;
  for (const method of [
    'select',
    'from',
    'where',
    'innerJoin',
    'leftJoin',
    'orderBy',
    'groupBy',
    'limit',
    'offset',
    'for',
    'values',
    'set',
    'insert',
    'update',
    'delete',
    'returning',
    'onConflictDoUpdate',
  ]) {
    chain[method] = asChain;
  }
  chain.transaction = () => Promise.reject(new Error(message));
  chain.execute = () => Promise.reject(new Error(message));
  chain.then = (_onFulfilled: unknown, onRejected?: (e: unknown) => void) => {
    const err = new Error(message);
    return onRejected ? (onRejected(err), Promise.resolve()) : Promise.reject(err);
  };
  return chain as unknown as DbExecutor;
}
const untouchableDb = failingDb(SENTINEL);

/** DB stub minimal untuk getFinanceSettings: `select().from()` resolve ke daftar baris. */
function dbReturning(rows: unknown[]): DbExecutor {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    offset: () => chain,
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
  };
  return { select: () => chain } as unknown as DbExecutor;
}

describe('Honor Tim — fungsi pengelolaan hanya untuk Admin (403 di server)', () => {
  const calls = (role: AuthContext['role']) =>
    [
      () => getHonorOverview(untouchableDb, user(role), 'case-1'),
      () => listHonorCases(untouchableDb, user(role)),
      () => saveHonorDraft(untouchableDb, user(role), 'case-1', []),
      () => publishHonor(untouchableDb, user(role), 'case-1'),
      () => setHonorPaid(untouchableDb, user(role), 'case-1', 'u-1', true),
    ] as const;

  for (const role of ADMIN_ONLY_ROLES) {
    it(`${role}: ditolak 403 sebelum DB disentuh`, async () => {
      for (const call of calls(role)) {
        await expect(call()).rejects.toMatchObject(CFG_FORBIDDEN);
      }
    });
  }

  for (const role of ADMIN_ROLES) {
    it(`${role}: lolos guard lalu menyentuh DB (bukan 403)`, async () => {
      for (const call of calls(role)) {
        await expect(call()).rejects.toThrow(SENTINEL);
      }
    });
  }
});

describe('Honor saya — boleh dibaca non-Admin, tetap scoped (R7/K3)', () => {
  it('Advokat/Paralegal lolos guard R lalu query DB (bukan 403)', async () => {
    await expect(listMyHonor(untouchableDb, user('advokat'))).rejects.toThrow(SENTINEL);
    await expect(listMyHonor(untouchableDb, user('paralegal'))).rejects.toThrow(SENTINEL);
  });
});

describe('Kas kantor — non-Admin tanpa hak → 403 (PRD §4)', () => {
  it('Advokat/Paralegal bukan kas_viewer ditolak 403', async () => {
    // getFinanceSettings mengembalikan default (kas_viewers kosong) → canViewKas false.
    const db = dbReturning([]);
    await expect(getKasSummary(db, user('advokat'))).rejects.toMatchObject(CFG_FORBIDDEN);
    await expect(getKasSummary(db, user('paralegal'))).rejects.toMatchObject(CFG_FORBIDDEN);
  });
});
