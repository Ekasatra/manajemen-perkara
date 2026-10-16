-- Hanya boleh ada satu Superadmin (unik di antara baris ber-role SuperAdmin).
-- Harus dijalankan SETELAH 0003 ter-commit: nilai enum baru tidak boleh dipakai di transaksi yang sama.
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_single_superadmin_idx"
  ON "public"."profiles" ("role")
  WHERE "role" = 'SuperAdmin';
