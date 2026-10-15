/**
 * Berkas surat di bucket privat (Agent E). Unggah langsung dari browser lewat
 * signed upload URL (body fungsi Vercel dibatasi ±4,5 MB, lampiran sampai 25 MB);
 * server hanya menerbitkan URL dan memeriksa path saat dirujuk.
 * Batas ukuran sebenarnya ditegakkan bucket (25 MB, migrasi B4).
 */
import { createSupabaseServiceClient } from '@ekasatra/db';
import { badRequest, validationError } from '@ekasatra/shared';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'] as const;

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  return base.replace(/[^\w.\- ]+/g, '_').replace(/\.{2,}/g, '.').slice(-120);
}

/** Murni: validasi nama & ukuran sebelum URL unggah diterbitkan. */
export function validateUpload(file: { name: string; size: number }): string {
  const name = safeFileName(file.name);
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (!name.includes('.') || !(ALLOWED_EXT as readonly string[]).includes(ext)) {
    throw validationError(`Tipe berkas tidak diizinkan (boleh: ${ALLOWED_EXT.join(', ')})`);
  }
  if (!Number.isFinite(file.size) || file.size <= 0) throw validationError('Berkas kosong');
  if (file.size > MAX_FILE_BYTES) throw validationError('Ukuran berkas maksimal 25 MB');
  return name;
}

/** Path wajib berada di bawah `{prefix}/{userId}/` agar tak bisa merujuk berkas orang lain. */
export function ownsPath(path: string, prefix: string, userId: string): boolean {
  return path.startsWith(`${prefix}/${userId}/`) && !path.includes('..');
}

export async function createUploadTarget(opts: {
  bucket: string;
  prefix: string;
  userId: string;
  fileName: string;
  size: number;
}) {
  const name = validateUpload({ name: opts.fileName, size: opts.size });
  const path = `${opts.prefix}/${opts.userId}/${crypto.randomUUID()}/${name}`;
  const { data, error } = await createSupabaseServiceClient()
    .storage.from(opts.bucket)
    .createSignedUploadUrl(path);
  if (error || !data) throw badRequest('Gagal menyiapkan unggahan');
  return { path, fileName: name, token: data.token, signedUrl: data.signedUrl };
}

/** Pastikan `path` milik user dan objeknya benar-benar sudah diunggah. */
export async function assertUploaded(opts: {
  bucket: string;
  path: string;
  prefix: string;
  userId: string;
}): Promise<void> {
  if (!ownsPath(opts.path, opts.prefix, opts.userId)) {
    throw validationError('Berkas tidak valid');
  }
  const { error } = await createSupabaseServiceClient()
    .storage.from(opts.bucket)
    .createSignedUrl(opts.path, 10);
  if (error) throw validationError('Berkas belum diunggah');
}

export async function signedDownloadUrl(
  bucket: string,
  path: string,
  fileName?: string | null,
): Promise<string> {
  const { data, error } = await createSupabaseServiceClient()
    .storage.from(bucket)
    .createSignedUrl(path, 300, fileName ? { download: fileName } : undefined);
  if (error || !data) throw badRequest('Berkas tidak dapat diunduh');
  return data.signedUrl;
}

/** Best-effort: kegagalan hapus berkas tidak menggagalkan operasi bisnis. */
export async function removeFile(bucket: string, path: string | null | undefined): Promise<void> {
  if (!path) return;
  await createSupabaseServiceClient().storage.from(bucket).remove([path]).catch(() => undefined);
}
