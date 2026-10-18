-- Migrasi W5 (R4): label status invoice "Sebagian" → "Sudah Bayar Sebagian" (PRD masukan §4 R4).
-- Kolom `status` adalah generated column (STORED); ekspresi tidak dapat diubah di tempat, jadi
-- kolom di-drop lalu ditambah ulang (nilai dihitung ulang dari paid_amount untuk semua baris),
-- lalu indeks status dibuat ulang (drop kolom otomatis menghapus invoices_status_idx).

ALTER TABLE "public"."invoices" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "public"."invoices" ADD COLUMN "status" text GENERATED ALWAYS AS ((case when paid_amount <= 0 then 'Belum Bayar' when paid_amount < amount then 'Sudah Bayar Sebagian' else 'Lunas' end)) STORED NOT NULL;--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "public"."invoices" USING btree ("status");--> statement-breakpoint
