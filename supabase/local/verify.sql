-- Dijalankan setelah semua migrasi. Gagal = RAISE EXCEPTION (psql ON_ERROR_STOP). Semua data di-ROLLBACK.
BEGIN;

-- Struktur
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_tables WHERE schemaname = 'public';
  IF n <> 18 THEN RAISE EXCEPTION 'expected 18 tables, got %', n; END IF;

  SELECT count(*) INTO n FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;
  IF n <> 0 THEN RAISE EXCEPTION '% tables without RLS', n; END IF;

  -- setiap tabel ber-updated_at punya trigger
  SELECT count(*) INTO n
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.column_name = 'updated_at'
    AND c.table_name NOT IN (SELECT event_object_table FROM information_schema.triggers WHERE trigger_name LIKE 'trg\_%\_updated\_at');
  IF n <> 0 THEN RAISE EXCEPTION '% tables missing updated_at trigger', n; END IF;

  SELECT count(*) INTO n FROM storage.buckets WHERE NOT public;
  IF n <> 4 THEN RAISE EXCEPTION 'expected 4 private buckets, got %', n; END IF;
END $$;

-- Fixture
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'adv@example.test');
INSERT INTO profiles (id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@example.test', 'Admin', 'Admin'),
  ('00000000-0000-0000-0000-000000000002', 'adv@example.test', 'Advokat', 'Advokat');
INSERT INTO clients (id, client_code, name, updated_at)
VALUES ('10000000-0000-0000-0000-000000000001', 'KL-0001', 'Klien Uji', now() - interval '1 day');
INSERT INTO cases (id, reg_no, title, client_id)
VALUES ('20000000-0000-0000-0000-000000000001', 'REG/2026/0001', 'Perkara Uji', '10000000-0000-0000-0000-000000000001');

-- token portal ≥ 32 karakter dan unik
DO $$
BEGIN
  IF (SELECT length(portal_token) FROM clients LIMIT 1) < 32 THEN RAISE EXCEPTION 'portal_token too short'; END IF;
END $$;

-- updated_at otomatis
UPDATE clients SET name = 'Klien Uji 2';
DO $$
BEGIN
  IF (SELECT updated_at FROM clients LIMIT 1) < now() - interval '1 hour' THEN
    RAISE EXCEPTION 'updated_at not refreshed';
  END IF;
END $$;

-- profiles: email unik case-insensitive
DO $$
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000003', 'x@example.test');
    INSERT INTO profiles (id, email, full_name) VALUES ('00000000-0000-0000-0000-000000000003', 'ADMIN@example.test', 'Dup');
    RAISE EXCEPTION 'expected unique_violation (profiles email)';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

-- surat_keluar: no_surat unik lower(), jenis Perkara wajib perkara
INSERT INTO surat_keluar (no_surat, tgl_surat, kepada, perihal, jenis, case_id, file_path)
VALUES ('AB/001', current_date, 'Pengadilan', 'Uji', 'Perkara', '20000000-0000-0000-0000-000000000001', 'surat/a.pdf');
DO $$
BEGIN
  BEGIN
    INSERT INTO surat_keluar (no_surat, tgl_surat, kepada, perihal, jenis, file_path)
    VALUES ('ab/001', current_date, 'X', 'X', 'Instansi', 'surat/b.pdf');
    RAISE EXCEPTION 'expected unique_violation (no_surat)';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO surat_keluar (no_surat, tgl_surat, kepada, perihal, jenis, file_path)
    VALUES ('CD/002', current_date, 'X', 'X', 'Perkara', 'surat/c.pdf');
    RAISE EXCEPTION 'expected check_violation (perkara needs case)';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- case_members: satu manager per perkara
INSERT INTO case_members (case_id, user_id, peran)
VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Manager');
DO $$
BEGIN
  BEGIN
    INSERT INTO case_members (case_id, user_id, peran)
    VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Manager');
    RAISE EXCEPTION 'expected unique_violation (second manager)';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

-- invoices: status turunan + view tagihan
INSERT INTO invoices (id, invoice_no, case_id, amount, paid_amount) VALUES
  ('30000000-0000-0000-0000-000000000001', 'INV/2026/0001', '20000000-0000-0000-0000-000000000001', 3000000000, 0),
  ('30000000-0000-0000-0000-000000000002', 'INV/2026/0002', '20000000-0000-0000-0000-000000000001', 1000, 1000);
DO $$
DECLARE s text; r record;
BEGIN
  SELECT status::text INTO s FROM invoices WHERE invoice_no = 'INV/2026/0001';
  IF s <> 'Belum Bayar' THEN RAISE EXCEPTION 'status 0 paid = %', s; END IF;
  UPDATE invoices SET paid_amount = 400000000 WHERE invoice_no = 'INV/2026/0001';
  SELECT status::text INTO s FROM invoices WHERE invoice_no = 'INV/2026/0001';
  IF s <> 'Sudah Bayar Sebagian' THEN RAISE EXCEPTION 'status partial = %', s; END IF;
  SELECT status::text INTO s FROM invoices WHERE invoice_no = 'INV/2026/0002';
  IF s <> 'Lunas' THEN RAISE EXCEPTION 'status lunas = %', s; END IF;

  SELECT * INTO r FROM v_case_billing WHERE case_id = '20000000-0000-0000-0000-000000000001';
  IF r.invoice_count <> 2 OR r.total_amount <> 3000001000 OR r.paid_amount <> 400001000
     OR r.outstanding_amount <> 2600000000 THEN
    RAISE EXCEPTION 'v_case_billing wrong: %', r;
  END IF;

  BEGIN
    INSERT INTO invoices (invoice_no, amount) VALUES ('INV/2026/0003', 10);
    RAISE EXCEPTION 'expected check_violation (client or case)';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- penomoran
DO $$
BEGIN
  IF next_counter('T/2026') <> 1 OR next_counter('T/2026') <> 2 OR next_counter('T/2027') <> 1 THEN
    RAISE EXCEPTION 'next_counter sequence wrong';
  END IF;
END $$;

-- Hak akses: anon ditolak total, authenticated hanya profil sendiri, next_counter tertutup
DO $$
DECLARE n int;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM 1 FROM clients LIMIT 1;
    RAISE EXCEPTION 'anon could read clients';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM profiles;
  IF n <> 1 THEN RAISE EXCEPTION 'authenticated sees % profiles, expected 1', n; END IF;
  BEGIN
    PERFORM 1 FROM clients LIMIT 1;
    RAISE EXCEPTION 'authenticated could read clients';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM next_counter('HACK');
    RAISE EXCEPTION 'authenticated could call next_counter';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;

ROLLBACK;
SELECT 'verify.sql OK' AS result;
