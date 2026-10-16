/**
 * Ikon menu. Server component hanya mengirim NAMA ikon (string) ke AppShell; pemetaan ke
 * komponen ada di sini. Tiap ikon dipilih karena relevan dengan isi menu (docs/DESIGN.md §8).
 */
import {
  Briefcase,
  CalendarDays,
  ChartColumn,
  CircleUser,
  Coins,
  Contact,
  FileCode2,
  FolderOpen,
  History,
  Inbox,
  LayoutDashboard,
  Send,
  Settings,
  Swords,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

// Ikon sama dengan menu aplikasi GAS (lucide), supaya sidebar terlihat identik.
export const NAV_ICONS = {
  home: LayoutDashboard,
  cases: Briefcase,
  clients: Users,
  opponents: Swords,
  advocates: Contact,
  users: UserCog,
  suratMasuk: Inbox,
  suratKeluar: Send,
  templates: FileCode2,
  invoices: Wallet,
  honorTim: Coins,
  reports: ChartColumn,
  settings: Settings,
  audit: History,
  profile: CircleUser,
  schedule: CalendarDays,
  documents: FolderOpen,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
