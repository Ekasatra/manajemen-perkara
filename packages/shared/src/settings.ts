/**
 * Skema validasi modul settings (Agent C · C6).
 * PRD §5.5: Admin baca/ubah semua staf; pimpinan_user_id, kas_viewers,
 * client_types, opponent_types, dll. Nilai disimpan jsonb per key.
 */
import { z } from 'zod';

export const updateSettingsSchema = z.object({
  office_name: z.string().optional(),
  office_address: z.string().optional(),
  office_phone: z.string().optional(),
  office_email: z.email().or(z.literal('')).optional(),
  office_city: z.string().optional(),
  office_website: z.string().optional(),
  logo_path: z.string().optional(),
  scope_assigned_only: z.boolean().optional(),
  banding_deadline_days: z.number().int().min(0).optional(),
  kas_kantor_persen: z.number().min(0).max(100).optional(),
  // Satu angka (lama) atau daftar hari, mis. [7, 1] = pengingat H-7 dan H-1.
  reminder_days: z
    .union([z.number().int().min(0), z.array(z.number().int().min(0).max(365)).min(1).max(5)])
    .optional(),
  notif_email_enabled: z.boolean().optional(),
  pimpinan_user_id: z.string().optional(),
  kas_viewers: z.array(z.string()).optional(),
  client_types: z.array(z.string()).optional(),
  opponent_types: z.array(z.string()).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;