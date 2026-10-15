/**
 * Kernel DB helpers (milik Agent A) — transaksi & penomoran atomik.
 * `nextCounter` memanggil fungsi SQL `next_counter(key)` hasil B2
 * (INSERT … ON CONFLICT DO UPDATE … RETURNING) — jangan menulis tabel
 * `counters` langsung.
 */
import { sql } from 'drizzle-orm';
import { internalError } from '@ekasatra/shared';
import type { Db } from '@ekasatra/db';

/**
 * Eksekutor = koneksi utama `Db` atau transaksi `withTx`. Drizzle
 * PgTransaction mengekspos API builder yang sama, maka diproyeksikan
 * sebagai `Db` lewat cast terkendali di dalam `withTx`.
 */
export type DbExecutor = Db;

/** Jalankan `fn` dalam satu transaksi; batal otomatis bila `fn` melempar. */
export async function withTx<T>(db: Db, fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => fn(tx as unknown as DbExecutor));
}

/** Ambil nomor urut berikutnya untuk `key` (mis. 'REG', 'INV', 'SM', 'KL') secara atomik. */
export async function nextCounter(db: DbExecutor, key: string): Promise<number> {
  const result: unknown = await db.execute<{ value: number }>(
    sql`select next_counter(${key}) as value`,
  );
  // Driver postgres-js mengembalikan array baris; pertahankan kedua bentuk agar aman.
  const rows: unknown = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
  const row = (rows as { value: number | string }[] | undefined)?.[0];
  if (!row) {
    throw internalError(`next_counter('${key}') tidak mengembalikan hasil`);
  }
  return Number(row.value);
}
