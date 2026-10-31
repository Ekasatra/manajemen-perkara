-- Migrasi 0009 (W9 / R10): sinkron akun (profiles) <-> Data Advokat & Data Paralegal.
-- Satu tabel `advocates` dipakai dua halaman, dibedakan kolom `kind`.
-- Sinkron lewat trigger agar berlaku untuk semua jalur tulis (API, seed, SQL) dan atomik:
--   * profiles role Advokat/Paralegal  -> baris advocates dibuat/diperbarui (nama, kind, is_active)
--   * profiles keluar dari dua role    -> baris ditandai nonaktif (TIDAK dihapus; honor historis aman)
--   * nama diubah di salah satu sisi   -> sisi lain ikut
-- Idempoten: aman dijalankan ulang.

ALTER TABLE "public"."advocates"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'Advokat',
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'advocates_kind_chk') THEN
    ALTER TABLE "public"."advocates"
      ADD CONSTRAINT "advocates_kind_chk" CHECK ("kind" IN ('Advokat', 'Paralegal'));
  END IF;
END $$;--> statement-breakpoint

-- Kolom wajib dilonggarkan: akun baru belum punya alamat/telepon/rekening/pendidikan.
-- Kelengkapan dihitung DB (is_complete), bukan nilai palsu.
ALTER TABLE "public"."advocates"
  ALTER COLUMN "address" DROP NOT NULL,
  ALTER COLUMN "phone" DROP NOT NULL,
  ALTER COLUMN "bank_account" DROP NOT NULL;--> statement-breakpoint

ALTER TABLE "public"."advocates" DROP CONSTRAINT IF EXISTS "advocates_education_min1";--> statement-breakpoint
ALTER TABLE "public"."advocates" DROP CONSTRAINT IF EXISTS "advocates_education_array";--> statement-breakpoint
ALTER TABLE "public"."advocates"
  ADD CONSTRAINT "advocates_education_array" CHECK (jsonb_typeof("education") = 'array');--> statement-breakpoint

ALTER TABLE "public"."advocates"
  ADD COLUMN IF NOT EXISTS "is_complete" boolean GENERATED ALWAYS AS (
    coalesce(btrim("address"), '') <> ''
    AND coalesce(btrim("phone"), '') <> ''
    AND coalesce(btrim("bank_account"), '') <> ''
    AND jsonb_array_length("education") >= 1
  ) STORED;--> statement-breakpoint

-- profiles -> advocates
CREATE OR REPLACE FUNCTION public.sync_advocate_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role::text IN ('Advokat', 'Paralegal') THEN
    INSERT INTO advocates (user_id, full_name, kind, is_active)
    VALUES (NEW.id, NEW.full_name, NEW.role::text, NEW.is_active)
    ON CONFLICT (user_id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          kind = EXCLUDED.kind,
          is_active = EXCLUDED.is_active;
  ELSE
    UPDATE advocates SET is_active = false WHERE user_id = NEW.id AND is_active;
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_profiles_sync_advocate ON public.profiles;--> statement-breakpoint
CREATE TRIGGER trg_profiles_sync_advocate
  AFTER INSERT OR UPDATE OF full_name, role, is_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_advocate_from_profile();--> statement-breakpoint

-- advocates -> profiles (nama). WHEN mencegah rekursi: profiles menulis balik nama yang sama.
CREATE OR REPLACE FUNCTION public.sync_profile_name_from_advocate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET full_name = NEW.full_name
  WHERE id = NEW.user_id AND full_name IS DISTINCT FROM NEW.full_name;
  RETURN NEW;
END $$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_advocates_sync_profile_name ON public.advocates;--> statement-breakpoint
CREATE TRIGGER trg_advocates_sync_profile_name
  AFTER UPDATE OF full_name ON public.advocates
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL AND OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION public.sync_profile_name_from_advocate();--> statement-breakpoint

-- Backfill 1: tautkan baris lama tanpa akun HANYA bila nama cocok persis satu-satu.
-- Kasus ambigu (nama kembar di salah satu sisi) dibiarkan dan dilaporkan lewat NOTICE.
WITH cand AS (
  SELECT a.id AS advocate_id, p.id AS profile_id,
         count(*) OVER (PARTITION BY a.id) AS n_profiles,
         count(*) OVER (PARTITION BY p.id) AS n_advocates
  FROM advocates a
  JOIN profiles p ON lower(btrim(p.full_name)) = lower(btrim(a.full_name))
  WHERE a.user_id IS NULL
    AND p.role::text IN ('Advokat', 'Paralegal')
    AND NOT EXISTS (SELECT 1 FROM advocates x WHERE x.user_id = p.id)
)
UPDATE advocates a SET user_id = c.profile_id
FROM cand c
WHERE a.id = c.advocate_id AND c.n_profiles = 1 AND c.n_advocates = 1;--> statement-breakpoint

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM advocates WHERE user_id IS NULL;
  IF n > 0 THEN
    RAISE NOTICE 'Backfill advocates: % baris belum tertaut ke akun (tidak cocok jelas) — tautkan manual.', n;
  END IF;
END $$;--> statement-breakpoint

-- Backfill 2: seragamkan baris tertaut dan buat baris untuk akun yang belum punya.
-- Menyentuh profiles memicu trigger (nama, kind, is_active ikut akun).
UPDATE profiles SET role = role
WHERE role::text IN ('Advokat', 'Paralegal') OR id IN (SELECT user_id FROM advocates WHERE user_id IS NOT NULL);
