-- Migrasi 0008 (fix drift): kolom updated_at untuk client_contacts.
-- Skema TS (packages/db/src/schema/master.ts) memakai helper ...timestamps yang
-- mencakup updated_at, tetapi migrasi 0005_client_contacts.sql (hand-written)
-- hanya membuat created_at. Migrasi ini menyelaraskan DB dengan skema:
-- menambah kolom updated_at + trigger set_updated_at (fungsi dari migrasi 0001).
-- Idempoten: aman dijalankan ulang.

ALTER TABLE "public"."client_contacts"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_client_contacts_updated_at'
      AND tgrelid = 'public.client_contacts'::regclass
  ) THEN
    CREATE TRIGGER trg_client_contacts_updated_at
      BEFORE UPDATE ON public.client_contacts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;--> statement-breakpoint
