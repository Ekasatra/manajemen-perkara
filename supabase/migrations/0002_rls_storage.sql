-- B3: RLS aktif di semua tabel public. Akses aplikasi lewat service role (bypass RLS) di server.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- Cabut hak anon/authenticated (termasuk objek yang dibuat kemudian), lalu buka seperlunya.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
--> statement-breakpoint

-- Satu-satunya kebijakan: user yang login boleh membaca profil sendiri.
GRANT SELECT ON public.profiles TO authenticated;
--> statement-breakpoint
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
--> statement-breakpoint

-- B4: bucket privat. Tanpa policy di storage.objects → hanya service role (signed URL dari server).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('case-documents', 'case-documents', false, 26214400),
  ('surat',          'surat',          false, 26214400),
  ('templates',      'templates',      false, 26214400),
  ('settings',       'settings',       false, 5242880)
ON CONFLICT (id) DO NOTHING;
