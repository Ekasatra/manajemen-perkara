/**
 * Paginasi sisi server (Agent A · A3). Halaman daftar membaca `?page=&pageSize=` dari searchParams
 * lalu memakai `offset`/`pageSize` untuk query; `DataTable` memakai `total` untuk tombol navigasi.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type SearchParams = Record<string, string | string[] | undefined>;

export type PageQuery = { page: number; pageSize: number; offset: number };

function intParam(raw: string | string[] | undefined, fallback: number, max: number): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
}

export function parsePageQuery(params: SearchParams, defaultSize = DEFAULT_PAGE_SIZE): PageQuery {
  const page = intParam(params.page, 1, 1_000_000);
  const pageSize = intParam(params.pageSize, defaultSize, MAX_PAGE_SIZE);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
