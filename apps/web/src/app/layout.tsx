import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { APP_NAME } from '@/components/ui/brand';
import { THEME_INIT_SCRIPT } from '@/shell/theme';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${APP_NAME}: Manajemen Perkara`,
  description: 'Sistem manajemen perkara hukum: perkara, surat, keuangan, dan portal klien.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${cormorant.variable} antialiased`}>{children}</body>
    </html>
  );
}
