/**
 * GET /api/v1/portal/[token] — Data Portal Klien (PRD §5.12 & G3)
 * Akses publik (tanpa login). Filter ketat data hanya milik klien terkait.
 * Token salah atau nonaktif mengembalikan pesan galat generik yang sama persis.
 */
import { createDb } from '@ekasatra/db';
import { ok, runRoute, getPortalData } from '@ekasatra/core';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return runRoute(async () => {
    const db = createDb();
    const data = await getPortalData(db, token);
    return ok(data);
  });
}

