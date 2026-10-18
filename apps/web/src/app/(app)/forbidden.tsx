import Link from 'next/link';
import { ErrorState } from '@/shell/states';
import { buttonClass } from '@/components/ui/styles';

/**
 * Halaman "Tidak punya akses" (PRD-MASUKAN §4 R7, §6): ditampilkan saat `requireCan()`
 * menolak akses URL langsung ke menu yang tidak berhak (mis. Advokat membuka /invoices).
 */
export default function AppForbidden() {
  return (
    <ErrorState
      title="Tidak punya akses"
      message="Akun Anda tidak berhak membuka halaman ini. Bila Anda merasa seharusnya berhak, hubungi Admin."
      action={
        <Link href="/" className={buttonClass.primary}>
          Kembali ke Beranda
        </Link>
      }
    />
  );
}
