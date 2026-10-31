-- Migrasi 0010 (W9 / R10): akun dihapus -> baris Data Advokat/Paralegal ditandai nonaktif.
-- FK advocates.user_id ON DELETE SET NULL melepas tautan, tetapi baris tetap "aktif" tanpa akun.
-- Trigger BEFORE DELETE (berjalan juga saat auth.users dihapus lewat cascade) menandainya nonaktif
-- sebelum tautan dilepas. Baris TIDAK dihapus (data historis aman). Idempoten.

CREATE OR REPLACE FUNCTION public.deactivate_advocate_on_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE advocates SET is_active = false WHERE user_id = OLD.id AND is_active;
  RETURN OLD;
END $$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_profiles_deactivate_advocate ON public.profiles;--> statement-breakpoint
CREATE TRIGGER trg_profiles_deactivate_advocate
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.deactivate_advocate_on_profile_delete();--> statement-breakpoint
