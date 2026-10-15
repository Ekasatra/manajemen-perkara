CREATE TYPE "public"."approval_action" AS ENUM('Submit', 'Approve', 'Reject', 'Sign', 'Send');--> statement-breakpoint
CREATE TYPE "public"."case_member_role" AS ENUM('Advokat', 'Paralegal', 'Manager');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('Aktif', 'Putus', 'Banding', 'Kasasi', 'PK', 'Selesai');--> statement-breakpoint
CREATE TYPE "public"."honor_status" AS ENUM('Belum', 'Dibayar');--> statement-breakpoint
CREATE TYPE "public"."surat_keluar_jenis" AS ENUM('Perkara', 'Instansi');--> statement-breakpoint
CREATE TYPE "public"."surat_keluar_status" AS ENUM('Draft', 'Review', 'Siap_TTD', 'Ditandatangani', 'Terkirim');--> statement-breakpoint
CREATE TYPE "public"."surat_masuk_status" AS ENUM('Belum', 'Didisposisi', 'Selesai');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_type" AS ENUM('Status', 'Putusan', 'Banding', 'Kasasi', 'PK', 'Catatan', 'Dokumen', 'Surat', 'Lainnya');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Admin', 'Advokat', 'Paralegal');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid,
	"user_name" text,
	"action" text NOT NULL,
	"module" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advocates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"bank_name" text,
	"bank_account" text NOT NULL,
	"license_number" text,
	"education" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trainings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advocates_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "advocates_education_min1" CHECK (jsonb_typeof("advocates"."education") = 'array' and jsonb_array_length("advocates"."education") >= 1)
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'Paralegal' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_approval" boolean DEFAULT true NOT NULL,
	"email_reminder" boolean DEFAULT true NOT NULL,
	"email_disposisi" boolean DEFAULT true NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_code" text NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"portal_token" text DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') NOT NULL,
	"portal_enabled" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_client_code_unique" UNIQUE("client_code"),
	CONSTRAINT "clients_portal_token_unique" UNIQUE("portal_token"),
	CONSTRAINT "clients_contacts_max20" CHECK (jsonb_typeof("clients"."contacts") = 'array' and jsonb_array_length("clients"."contacts") <= 20)
);
--> statement-breakpoint
CREATE TABLE "opponents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"address" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opponents_contacts_max20" CHECK (jsonb_typeof("opponents"."contacts") = 'array' and jsonb_array_length("opponents"."contacts") <= 20)
);
--> statement-breakpoint
CREATE TABLE "case_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"title" text NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text,
	"file_size" bigint,
	"mime_type" text,
	"shared_with_client" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_documents_size_max25mb" CHECK ("case_documents"."file_size" is null or "case_documents"."file_size" <= 26214400)
);
--> statement-breakpoint
CREATE TABLE "case_members" (
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"peran" "case_member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_members_case_id_user_id_peran_pk" PRIMARY KEY("case_id","user_id","peran")
);
--> statement-breakpoint
CREATE TABLE "case_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"schedule_date" date NOT NULL,
	"schedule_time" time,
	"kind" text DEFAULT 'Sidang' NOT NULL,
	"location" text,
	"notes" text,
	"status" text DEFAULT 'Terjadwal' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"event_type" timeline_event_type DEFAULT 'Catatan' NOT NULL,
	"event_date" date DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reg_no" text NOT NULL,
	"title" text NOT NULL,
	"client_id" uuid NOT NULL,
	"opponent_id" uuid,
	"case_number" text,
	"court" text,
	"case_type" text,
	"description" text,
	"status" "case_status" DEFAULT 'Aktif' NOT NULL,
	"start_date" date,
	"putus_date" date,
	"upaya_deadline" date,
	"closed_date" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_reg_no_unique" UNIQUE("reg_no")
);
--> statement-breakpoint
CREATE TABLE "surat_approval_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surat_id" uuid NOT NULL,
	"action" "approval_action" NOT NULL,
	"actor_id" uuid,
	"actor_name" text,
	"from_status" "surat_keluar_status",
	"to_status" "surat_keluar_status",
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surat_keluar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_surat" text NOT NULL,
	"tgl_surat" date NOT NULL,
	"kepada" text NOT NULL,
	"perihal" text NOT NULL,
	"jenis" "surat_keluar_jenis" NOT NULL,
	"case_id" uuid,
	"status" "surat_keluar_status" DEFAULT 'Draft' NOT NULL,
	"created_by" uuid,
	"reviewer_id" uuid,
	"signer_id" uuid,
	"file_path" text NOT NULL,
	"file_name" text,
	"signed_file_path" text,
	"signed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"sent_to_email" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surat_keluar_perkara_needs_case" CHECK ("surat_keluar"."jenis" <> 'Perkara' or "surat_keluar"."case_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "surat_masuk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_agenda" text NOT NULL,
	"no_surat" text,
	"sender" text NOT NULL,
	"subject" text NOT NULL,
	"tgl_surat" date,
	"tgl_terima" date DEFAULT now() NOT NULL,
	"sifat" text DEFAULT 'Biasa' NOT NULL,
	"status" "surat_masuk_status" DEFAULT 'Belum' NOT NULL,
	"case_id" uuid,
	"assigned_to" uuid,
	"disposisi_note" text,
	"file_path" text,
	"file_name" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "surat_masuk_no_agenda_unique" UNIQUE("no_agenda")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"file_path" text NOT NULL,
	"file_name" text,
	"file_size" bigint,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "honor_tim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"draft_amount" bigint DEFAULT 0 NOT NULL,
	"published_amount" bigint,
	"published_at" timestamp with time zone,
	"status" "honor_status" DEFAULT 'Belum' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "honor_tim_case_user_uq" UNIQUE("case_id","user_id"),
	CONSTRAINT "honor_tim_draft_nonneg" CHECK ("honor_tim"."draft_amount" >= 0),
	CONSTRAINT "honor_tim_published_nonneg" CHECK ("honor_tim"."published_amount" is null or "honor_tim"."published_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_no" text NOT NULL,
	"client_id" uuid,
	"case_id" uuid,
	"description" text,
	"amount" bigint NOT NULL,
	"paid_amount" bigint DEFAULT 0 NOT NULL,
	"invoice_date" date DEFAULT now() NOT NULL,
	"due_date" date,
	"paid_date" date,
	"status" text GENERATED ALWAYS AS ((case when paid_amount <= 0 then 'Belum Bayar' when paid_amount < amount then 'Sebagian' else 'Lunas' end)) STORED NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_no_unique" UNIQUE("invoice_no"),
	CONSTRAINT "invoices_amount_positive" CHECK ("invoices"."amount" > 0),
	CONSTRAINT "invoices_paid_nonneg" CHECK ("invoices"."paid_amount" >= 0),
	CONSTRAINT "invoices_client_or_case" CHECK ("invoices"."client_id" is not null or "invoices"."case_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advocates" ADD CONSTRAINT "advocates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opponents" ADD CONSTRAINT "opponents_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_members" ADD CONSTRAINT "case_members_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_members" ADD CONSTRAINT "case_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_schedules" ADD CONSTRAINT "case_schedules_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_schedules" ADD CONSTRAINT "case_schedules_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_timeline" ADD CONSTRAINT "case_timeline_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_timeline" ADD CONSTRAINT "case_timeline_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_opponent_id_opponents_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."opponents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_approval_logs" ADD CONSTRAINT "surat_approval_logs_surat_id_surat_keluar_id_fk" FOREIGN KEY ("surat_id") REFERENCES "public"."surat_keluar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_approval_logs" ADD CONSTRAINT "surat_approval_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluar" ADD CONSTRAINT "surat_keluar_signer_id_profiles_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "honor_tim" ADD CONSTRAINT "honor_tim_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "honor_tim" ADD CONSTRAINT "honor_tim_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_logs_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_module_idx" ON "activity_logs" USING btree ("module");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_lower_uq" ON "profiles" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_created_at_idx" ON "clients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "opponents_name_idx" ON "opponents" USING btree ("name");--> statement-breakpoint
CREATE INDEX "case_documents_case_idx" ON "case_documents" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_members_one_manager_uq" ON "case_members" USING btree ("case_id") WHERE "case_members"."peran" = 'Manager';--> statement-breakpoint
CREATE INDEX "case_members_user_idx" ON "case_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "case_schedules_case_idx" ON "case_schedules" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_schedules_date_idx" ON "case_schedules" USING btree ("schedule_date");--> statement-breakpoint
CREATE INDEX "case_schedules_status_idx" ON "case_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "case_timeline_case_idx" ON "case_timeline" USING btree ("case_id","event_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cases_client_id_idx" ON "cases" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "cases_status_idx" ON "cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cases_created_by_idx" ON "cases" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "cases_upaya_deadline_idx" ON "cases" USING btree ("upaya_deadline");--> statement-breakpoint
CREATE INDEX "surat_approval_logs_surat_idx" ON "surat_approval_logs" USING btree ("surat_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "surat_keluar_no_surat_lower_uq" ON "surat_keluar" USING btree (lower("no_surat"));--> statement-breakpoint
CREATE INDEX "surat_keluar_status_idx" ON "surat_keluar" USING btree ("status");--> statement-breakpoint
CREATE INDEX "surat_keluar_case_idx" ON "surat_keluar" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "surat_keluar_created_by_idx" ON "surat_keluar" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "surat_keluar_reviewer_idx" ON "surat_keluar" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "surat_keluar_signer_idx" ON "surat_keluar" USING btree ("signer_id");--> statement-breakpoint
CREATE INDEX "surat_masuk_status_idx" ON "surat_masuk" USING btree ("status");--> statement-breakpoint
CREATE INDEX "surat_masuk_case_idx" ON "surat_masuk" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "surat_masuk_assigned_idx" ON "surat_masuk" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "surat_masuk_tgl_terima_idx" ON "surat_masuk" USING btree ("tgl_terima");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "honor_tim_user_idx" ON "honor_tim" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "honor_tim_status_idx" ON "honor_tim" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_case_idx" ON "invoices" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_date_idx" ON "invoices" USING btree ("invoice_date");