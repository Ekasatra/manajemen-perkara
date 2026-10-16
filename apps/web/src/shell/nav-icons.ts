/**
 * Ikon menu. Server component hanya mengirim NAMA ikon (string) ke AppShell; pemetaan ke
 * komponen ada di sini. Tiap ikon dipilih karena relevan dengan isi menu (docs/DESIGN.md §8).
 */
import {
  Briefcase,
  ChartColumn,
  FileOutput,
  FileText,
  LayoutDashboard,
  Mail,
  Receipt,
  ScrollText,
  Scale,
  Settings,
  UserX,
  Users,
  Wallet,
} from 'lucide-react';

export const NAV_ICONS = {
  home: LayoutDashboard,
  cases: Scale,
  clients: Users,
  opponents: UserX,
  advocates: Briefcase,
  users: Users,
  suratMasuk: Mail,
  suratKeluar: FileOutput,
  templates: FileText,
  invoices: Receipt,
  honorTim: Wallet,
  reports: ChartColumn,
  settings: Settings,
  audit: ScrollText,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
