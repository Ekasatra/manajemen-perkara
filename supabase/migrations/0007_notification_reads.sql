-- R8: status "sudah dibaca" notifikasi per pengguna.
-- Notifikasi sendiri tetap turunan (dihitung dari surat & jadwal); tabel ini hanya
-- menyimpan kunci notifikasi yang sudah dibaca, sehingga badge, kartu dashboard,
-- dan daftar memakai filter yang sama.
CREATE TABLE IF NOT EXISTS "notification_reads" (
	"user_id" uuid NOT NULL,
	"notification_key" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_reads_user_id_notification_key_pk" PRIMARY KEY("user_id","notification_key")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_reads_user_id_profiles_id_fk'
  ) THEN
    ALTER TABLE "notification_reads"
      ADD CONSTRAINT "notification_reads_user_id_profiles_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_reads_user_idx" ON "notification_reads" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
