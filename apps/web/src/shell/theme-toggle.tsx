'use client';

import { Moon, Sun } from 'lucide-react';
import { THEME_KEY } from './theme';

/** Ikon dipilih lewat varian `dark:` (CSS), jadi tidak ada state yang bisa tidak cocok saat hidrasi. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  function toggle() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Penyimpanan diblokir: tema tetap berganti untuk sesi ini.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ganti tema terang atau gelap"
      title="Ganti tema terang atau gelap"
      className={`inline-flex size-11 items-center justify-center rounded-control text-navy-500 transition hover:bg-navy-100 hover:text-navy-800 print:hidden ${className}`}
    >
      <Moon aria-hidden="true" size={18} className="dark:hidden" />
      <Sun aria-hidden="true" size={18} className="hidden dark:block" />
    </button>
  );
}
