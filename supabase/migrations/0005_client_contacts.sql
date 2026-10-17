-- Migrasi W3 (R3): tabel client_contacts untuk kontak majemuk klien.
-- Kolom phone/email di clients dipertahankan untuk kompatibilitas baca selama transisi;
-- aplikasi akan menuliskan ke keduanya (client_contacts sebagai kanonis, phone/email sebagai mirror).

CREATE TYPE "public"."client_contact_kind" AS ENUM('phone', 'email');--> statement-breakpoint

CREATE TABLE "public"."client_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL REFERENCES "public"."clients"("id") ON DELETE CASCADE,
	"kind" "public"."client_contact_kind" NOT NULL,
	"value" text NOT NULL,
	"label" text,
	"is_primary" boolean NOT NULL DEFAULT false,
	"position" integer NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "client_contacts_client_idx" ON "public"."client_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_contacts_kind_idx" ON "public"."client_contacts" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "client_contacts_one_primary_per_kind_idx" ON "public"."client_contacts" USING btree ("client_id", "kind") WHERE "is_primary" = true;--> statement-breakpoint

-- Backfill: data lama non-null dari clients.phone / clients.email menjadi satu baris primary masing-masing.
INSERT INTO "public"."client_contacts" ("client_id", "kind", "value", "is_primary", "position")
SELECT "id", 'phone', "phone", true, 0 FROM "public"."clients" WHERE "phone" IS NOT NULL AND trim("phone") <> '';--> statement-breakpoint
INSERT INTO "public"."client_contacts" ("client_id", "kind", "value", "is_primary", "position")
SELECT "id", 'email', "email", true, 0 FROM "public"."clients" WHERE "email" IS NOT NULL AND trim("email") <> '';--> statement-breakpoint