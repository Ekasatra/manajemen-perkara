/**
 * Layout halaman auth (login, setup) gaya GAS: kiri panel navy berisi merek dan ringkasan,
 * kanan kartu form. Di bawah lg panel kiri disembunyikan dan merek tampil bertumpuk di atas form.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { FileSignature, FolderArchive, ShieldCheck } from 'lucide-react';
import { Brand, LogoMark } from '@/components/ui/brand';
import { ThemeToggle } from '@/shell/theme-toggle';

const FEATURES = [
  { icon: ShieldCheck, label: 'Akses berbasis peran' },
  { icon: FileSignature, label: 'Persetujuan & TTD surat' },
  { icon: FolderArchive, label: 'Arsip dokumen perkara' },
] as const;

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="login-hero relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <LogoMark size={520} className="absolute -bottom-24 -right-24 text-white opacity-[0.06]" />
        <div className="relative">
          <Brand light size={40} />
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold-300">
            Sistem Manajemen Kantor Hukum
          </p>
          <p className="font-display text-5xl font-semibold leading-[1.1]">
            Surat &amp; Perkara,
            <br />
            tertata dalam satu tempat.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-white/70">
            Administrasi korespondensi resmi, alur persetujuan surat berjenjang, registrasi perkara,
            jadwal sidang, dokumen, dan honorarium.
          </p>
          <ul className="mt-8 grid grid-cols-3 gap-3 text-xs">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="rounded-control border border-white/10 bg-white/10 p-3 backdrop-blur"
              >
                <Icon aria-hidden="true" size={18} className="mb-2 text-gold-300" />
                <span className="text-white/80">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[11px] text-white/40">
          © {new Date().getFullYear()} EKASATRA Law &amp; Policy Advisory
        </p>
      </div>
      <div className="relative flex items-center justify-center p-5 sm:p-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand variant="vertical" />
          </div>
          {children}
          <p className="mt-6 text-center text-[11px] text-navy-400">
            Klien? Gunakan tautan portal khusus yang dikirimkan kantor kami.
          </p>
          <p className="mt-2 text-center text-[11px] text-navy-400">
            <Link href="/setup" className="underline hover:text-navy-700">
              Setup Admin pertama
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
