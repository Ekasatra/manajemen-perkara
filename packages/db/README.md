# @ekasatra/db

Skema database (Drizzle ORM + Postgres/Supabase), migrasi, dan seed. Pemilik: Agent B.

- **Sumber kebenaran skema:** `src/schema/*.ts`. Dokumen kolom di bawah dibangkitkan dari snapshot migrasi.
- **Migrasi:** `../../supabase/migrations/` (`0000` tabel/enum/indeks dari Drizzle; `0001` fungsi, trigger, view; `0002` RLS + bucket).
- **Perubahan skema:** hanya lewat Agent B (`docs/REQUESTS.md`). Ubah schema → `pnpm --filter @ekasatra/db db:generate`; SQL tulis-tangan → `db:generate --custom --name=...`.

## Perintah

| Perintah                                  | Fungsi                                                                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @ekasatra/db db:generate`  | Buat migrasi dari perubahan `src/schema`                                                                                                                                                |
| `pnpm --filter @ekasatra/db db:migrate`   | Terapkan migrasi ke `DATABASE_URL`                                                                                                                                                      |
| `pnpm --filter @ekasatra/db seed`         | Settings default + 1 Admin (butuh `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, opsional `SEED_ADMIN_NAME`, serta `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) |
| `pnpm --filter @ekasatra/db verify:local` | Uji migrasi bersih dari nol di Postgres 17 (Docker) + perilaku + konkurensi `next_counter`. Tidak menyentuh remote                                                                      |

## Konvensi

- **Uang:** `bigint` rupiah bulat (mode `number` di Drizzle).
- **Tanggal:** kolom `date` bertipe string `YYYY-MM-DD`; waktu `timestamptz` (UTC).
- **File:** kolom `*_path` berisi path di bucket Storage privat (`case-documents`, `surat`, `templates`, `settings`), bukan URL. Akses lewat signed URL dari server.
- **Penomoran:** `select next_counter('<kunci>')` → integer, atomik. Hanya `service_role` yang boleh memanggil. Kunci: `REG/{tahun}`, `SM/{tahun}`, `INV/{tahun}`, `KL`.
- **`updated_at`:** diisi trigger `set_updated_at()` pada setiap tabel yang punya kolom itu. Tabel baru dengan `updated_at` harus memasang trigger di migrasinya.
- **Hak akses:** RLS aktif di semua tabel; `anon`/`authenticated` tidak punya hak apa pun kecuali `authenticated` boleh `SELECT` profil sendiri. Aplikasi memakai service role di server.
- **Hapus:** anak perkara (timeline, jadwal, dokumen, anggota, honor) ikut terhapus bersama perkara. Perkara/klien yang punya invoice atau surat keluar **tidak bisa dihapus** (`RESTRICT`).
- **View `v_case_billing`:** per perkara → `invoice_count`, `total_amount`, `paid_amount`, `outstanding_amount` (perkara tanpa invoice = 0).

## Enum

| Enum                  | Nilai                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| `approval_action`     | Submit, Approve, Reject, Sign, Send                                    |
| `case_member_role`    | Advokat, Paralegal, Manager                                            |
| `case_status`         | Aktif, Putus, Banding, Kasasi, PK, Selesai                             |
| `honor_status`        | Belum, Dibayar                                                         |
| `surat_keluar_jenis`  | Perkara, Instansi                                                      |
| `surat_keluar_status` | Draft, Review, Siap_TTD, Ditandatangani, Terkirim                      |
| `surat_masuk_status`  | Belum, Didisposisi, Selesai                                            |
| `timeline_event_type` | Status, Putusan, Banding, Kasasi, PK, Catatan, Dokumen, Surat, Lainnya |
| `user_role`           | Admin, Advokat, Paralegal                                              |

## Tabel

### `profiles`

Akun aplikasi, 1:1 dengan `auth.users`.

| Kolom                | Tipe                     | Null  | Default / Keterangan  |
| -------------------- | ------------------------ | ----- | --------------------- |
| `id`                 | uuid                     | tidak | PK                    |
| `email`              | text                     | tidak |                       |
| `full_name`          | text                     | tidak |                       |
| `role`               | user_role                | tidak | default `'Paralegal'` |
| `is_active`          | boolean                  | tidak | default `True`        |
| `email_approval`     | boolean                  | tidak | default `True`        |
| `email_reminder`     | boolean                  | tidak | default `True`        |
| `email_disposisi`    | boolean                  | tidak | default `True`        |
| `failed_login_count` | integer                  | tidak | default `0`           |
| `locked_until`       | timestamp with time zone | ya    |                       |
| `last_login_at`      | timestamp with time zone | ya    |                       |
| `created_at`         | timestamp with time zone | tidak | default `now()`       |
| `updated_at`         | timestamp with time zone | tidak | default `now()`       |

- FK: `id` → `users.id` (cascade)
- indeks: `profiles_email_lower_uq` (unik), `profiles_role_idx`

### `advocates`

Data advokat (terhubung opsional ke satu akun).

| Kolom            | Tipe                     | Null  | Default / Keterangan            |
| ---------------- | ------------------------ | ----- | ------------------------------- |
| `id`             | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `user_id`        | uuid                     | ya    |                                 |
| `full_name`      | text                     | tidak |                                 |
| `address`        | text                     | tidak |                                 |
| `phone`          | text                     | tidak |                                 |
| `bank_name`      | text                     | ya    |                                 |
| `bank_account`   | text                     | tidak |                                 |
| `license_number` | text                     | ya    |                                 |
| `education`      | jsonb                    | tidak | default `'[]'::jsonb`           |
| `trainings`      | jsonb                    | tidak | default `'[]'::jsonb`           |
| `created_at`     | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`     | timestamp with time zone | tidak | default `now()`                 |

- unik `advocates_user_id_unique`: user_id
- check `advocates_education_min1`
- FK: `user_id` → `profiles.id` (set null)

### `settings`

Pengaturan key–value (`value` jsonb). Nilai awal: `DEFAULT_SETTINGS`.

| Kolom        | Tipe                     | Null  | Default / Keterangan |
| ------------ | ------------------------ | ----- | -------------------- |
| `key`        | text                     | tidak | PK                   |
| `value`      | jsonb                    | tidak |                      |
| `updated_by` | uuid                     | ya    |                      |
| `updated_at` | timestamp with time zone | tidak | default `now()`      |

- FK: `updated_by` → `profiles.id` (set null)

### `counters`

Penomoran otomatis; hanya diubah lewat `next_counter(key)`.

| Kolom        | Tipe                     | Null  | Default / Keterangan |
| ------------ | ------------------------ | ----- | -------------------- |
| `key`        | text                     | tidak | PK                   |
| `value`      | integer                  | tidak | default `0`          |
| `updated_at` | timestamp with time zone | tidak | default `now()`      |

### `activity_logs`

Audit log.

| Kolom         | Tipe                     | Null  | Default / Keterangan |
| ------------- | ------------------------ | ----- | -------------------- |
| `id`          | bigint                   | tidak | PK; identity         |
| `user_id`     | uuid                     | ya    |                      |
| `user_name`   | text                     | ya    |                      |
| `action`      | text                     | tidak |                      |
| `module`      | text                     | tidak |                      |
| `entity_type` | text                     | ya    |                      |
| `entity_id`   | text                     | ya    |                      |
| `description` | text                     | ya    |                      |
| `metadata`    | jsonb                    | ya    |                      |
| `created_at`  | timestamp with time zone | tidak | default `now()`      |

- FK: `user_id` → `profiles.id` (set null)
- indeks: `activity_logs_created_at_idx`, `activity_logs_user_idx`, `activity_logs_module_idx`, `activity_logs_entity_idx`

### `clients`

Klien. `portal_token` default 64 hex acak.

| Kolom            | Tipe                     | Null  | Default / Keterangan                     |
| ---------------- | ------------------------ | ----- | ---------------------------------------- |
| `id`             | uuid                     | tidak | PK; default `gen_random_uuid()`          |
| `client_code`    | text                     | tidak |                                          |
| `name`           | text                     | tidak |                                          |
| `type`           | text                     | ya    |                                          |
| `contacts`       | jsonb                    | tidak | default `'[]'::jsonb`                    |
| `phone`          | text                     | ya    |                                          |
| `email`          | text                     | ya    |                                          |
| `address`        | text                     | ya    |                                          |
| `notes`          | text                     | ya    |                                          |
| `portal_token`   | text                     | tidak | default `replace(gen_random_uuid()::text |     | gen_random_uuid()::text, '-', '')` |
| `portal_enabled` | boolean                  | tidak | default `True`                           |
| `created_by`     | uuid                     | ya    |                                          |
| `created_at`     | timestamp with time zone | tidak | default `now()`                          |
| `updated_at`     | timestamp with time zone | tidak | default `now()`                          |

- unik `clients_client_code_unique`: client_code
- unik `clients_portal_token_unique`: portal_token
- check `clients_contacts_max20`
- FK: `created_by` → `profiles.id` (set null)
- indeks: `clients_name_idx`, `clients_created_at_idx`

### `opponents`

Pihak lawan.

| Kolom        | Tipe                     | Null  | Default / Keterangan            |
| ------------ | ------------------------ | ----- | ------------------------------- |
| `id`         | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `name`       | text                     | tidak |                                 |
| `type`       | text                     | ya    |                                 |
| `contacts`   | jsonb                    | tidak | default `'[]'::jsonb`           |
| `address`    | text                     | ya    |                                 |
| `notes`      | text                     | ya    |                                 |
| `created_by` | uuid                     | ya    |                                 |
| `created_at` | timestamp with time zone | tidak | default `now()`                 |
| `updated_at` | timestamp with time zone | tidak | default `now()`                 |

- check `opponents_contacts_max20`
- FK: `created_by` → `profiles.id` (set null)
- indeks: `opponents_name_idx`

### `cases`

Perkara.

| Kolom            | Tipe                     | Null  | Default / Keterangan            |
| ---------------- | ------------------------ | ----- | ------------------------------- |
| `id`             | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `reg_no`         | text                     | tidak |                                 |
| `title`          | text                     | tidak |                                 |
| `client_id`      | uuid                     | tidak |                                 |
| `opponent_id`    | uuid                     | ya    |                                 |
| `case_number`    | text                     | ya    |                                 |
| `court`          | text                     | ya    |                                 |
| `case_type`      | text                     | ya    |                                 |
| `description`    | text                     | ya    |                                 |
| `status`         | case_status              | tidak | default `'Aktif'`               |
| `start_date`     | date                     | ya    |                                 |
| `putus_date`     | date                     | ya    |                                 |
| `upaya_deadline` | date                     | ya    |                                 |
| `closed_date`    | date                     | ya    |                                 |
| `created_by`     | uuid                     | ya    |                                 |
| `created_at`     | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`     | timestamp with time zone | tidak | default `now()`                 |

- unik `cases_reg_no_unique`: reg_no
- FK: `client_id` → `clients.id` (restrict); `opponent_id` → `opponents.id` (set null); `created_by` → `profiles.id` (set null)
- indeks: `cases_client_id_idx`, `cases_status_idx`, `cases_created_by_idx`, `cases_upaya_deadline_idx`

### `case_members`

Tim perkara (PK gabungan; maksimal satu `Manager` per perkara).

| Kolom        | Tipe                     | Null  | Default / Keterangan |
| ------------ | ------------------------ | ----- | -------------------- |
| `case_id`    | uuid                     | tidak |                      |
| `user_id`    | uuid                     | tidak |                      |
| `peran`      | case_member_role         | tidak |                      |
| `created_at` | timestamp with time zone | tidak | default `now()`      |

- PK gabungan: case_id, user_id, peran
- FK: `case_id` → `cases.id` (cascade); `user_id` → `profiles.id` (cascade)
- indeks: `case_members_one_manager_uq` (unik), `case_members_user_idx`

### `case_timeline`

Riwayat peristiwa perkara.

| Kolom         | Tipe                     | Null  | Default / Keterangan            |
| ------------- | ------------------------ | ----- | ------------------------------- |
| `id`          | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `case_id`     | uuid                     | tidak |                                 |
| `event_type`  | timeline_event_type      | tidak | default `'Catatan'`             |
| `event_date`  | date                     | tidak | default `now()`                 |
| `title`       | text                     | tidak |                                 |
| `description` | text                     | ya    |                                 |
| `created_by`  | uuid                     | ya    |                                 |
| `created_at`  | timestamp with time zone | tidak | default `now()`                 |

- FK: `case_id` → `cases.id` (cascade); `created_by` → `profiles.id` (set null)
- indeks: `case_timeline_case_idx`

### `case_schedules`

Jadwal (sidang dll.).

| Kolom           | Tipe                     | Null  | Default / Keterangan            |
| --------------- | ------------------------ | ----- | ------------------------------- |
| `id`            | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `case_id`       | uuid                     | tidak |                                 |
| `schedule_date` | date                     | tidak |                                 |
| `schedule_time` | time                     | ya    |                                 |
| `kind`          | text                     | tidak | default `'Sidang'`              |
| `location`      | text                     | ya    |                                 |
| `notes`         | text                     | ya    |                                 |
| `status`        | text                     | tidak | default `'Terjadwal'`           |
| `created_by`    | uuid                     | ya    |                                 |
| `created_at`    | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`    | timestamp with time zone | tidak | default `now()`                 |

- FK: `case_id` → `cases.id` (cascade); `created_by` → `profiles.id` (set null)
- indeks: `case_schedules_case_idx`, `case_schedules_date_idx`, `case_schedules_status_idx`

### `case_documents`

Dokumen perkara; file di bucket `case-documents`.

| Kolom                | Tipe                     | Null  | Default / Keterangan            |
| -------------------- | ------------------------ | ----- | ------------------------------- |
| `id`                 | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `case_id`            | uuid                     | tidak |                                 |
| `title`              | text                     | tidak |                                 |
| `file_path`          | text                     | tidak |                                 |
| `file_name`          | text                     | ya    |                                 |
| `file_size`          | bigint                   | ya    |                                 |
| `mime_type`          | text                     | ya    |                                 |
| `shared_with_client` | boolean                  | tidak | default `False`                 |
| `uploaded_by`        | uuid                     | ya    |                                 |
| `created_at`         | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`         | timestamp with time zone | tidak | default `now()`                 |

- check `case_documents_size_max25mb`
- FK: `case_id` → `cases.id` (cascade); `uploaded_by` → `profiles.id` (set null)
- indeks: `case_documents_case_idx`

### `surat_masuk`

Surat masuk.

| Kolom            | Tipe                     | Null  | Default / Keterangan            |
| ---------------- | ------------------------ | ----- | ------------------------------- |
| `id`             | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `no_agenda`      | text                     | tidak |                                 |
| `no_surat`       | text                     | ya    |                                 |
| `sender`         | text                     | tidak |                                 |
| `subject`        | text                     | tidak |                                 |
| `tgl_surat`      | date                     | ya    |                                 |
| `tgl_terima`     | date                     | tidak | default `now()`                 |
| `sifat`          | text                     | tidak | default `'Biasa'`               |
| `status`         | surat_masuk_status       | tidak | default `'Belum'`               |
| `case_id`        | uuid                     | ya    |                                 |
| `assigned_to`    | uuid                     | ya    |                                 |
| `disposisi_note` | text                     | ya    |                                 |
| `file_path`      | text                     | ya    |                                 |
| `file_name`      | text                     | ya    |                                 |
| `created_by`     | uuid                     | ya    |                                 |
| `created_at`     | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`     | timestamp with time zone | tidak | default `now()`                 |

- unik `surat_masuk_no_agenda_unique`: no_agenda
- FK: `case_id` → `cases.id` (set null); `assigned_to` → `profiles.id` (set null); `created_by` → `profiles.id` (set null)
- indeks: `surat_masuk_status_idx`, `surat_masuk_case_idx`, `surat_masuk_assigned_idx`, `surat_masuk_tgl_terima_idx`

### `surat_keluar`

Surat keluar; `lower(no_surat)` unik.

| Kolom              | Tipe                     | Null  | Default / Keterangan            |
| ------------------ | ------------------------ | ----- | ------------------------------- |
| `id`               | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `no_surat`         | text                     | tidak |                                 |
| `tgl_surat`        | date                     | tidak |                                 |
| `kepada`           | text                     | tidak |                                 |
| `perihal`          | text                     | tidak |                                 |
| `jenis`            | surat_keluar_jenis       | tidak |                                 |
| `case_id`          | uuid                     | ya    |                                 |
| `status`           | surat_keluar_status      | tidak | default `'Draft'`               |
| `created_by`       | uuid                     | ya    |                                 |
| `reviewer_id`      | uuid                     | ya    |                                 |
| `signer_id`        | uuid                     | ya    |                                 |
| `file_path`        | text                     | tidak |                                 |
| `file_name`        | text                     | ya    |                                 |
| `signed_file_path` | text                     | ya    |                                 |
| `signed_at`        | timestamp with time zone | ya    |                                 |
| `sent_at`          | timestamp with time zone | ya    |                                 |
| `sent_to_email`    | text                     | ya    |                                 |
| `notes`            | text                     | ya    |                                 |
| `created_at`       | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`       | timestamp with time zone | tidak | default `now()`                 |

- check `surat_keluar_perkara_needs_case`
- FK: `case_id` → `cases.id` (restrict); `created_by` → `profiles.id` (set null); `reviewer_id` → `profiles.id` (set null); `signer_id` → `profiles.id` (set null)
- indeks: `surat_keluar_no_surat_lower_uq` (unik), `surat_keluar_status_idx`, `surat_keluar_case_idx`, `surat_keluar_created_by_idx`, `surat_keluar_reviewer_idx`, `surat_keluar_signer_idx`

### `surat_approval_logs`

Jejak langkah approval surat keluar.

| Kolom         | Tipe                     | Null  | Default / Keterangan            |
| ------------- | ------------------------ | ----- | ------------------------------- |
| `id`          | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `surat_id`    | uuid                     | tidak |                                 |
| `action`      | approval_action          | tidak |                                 |
| `actor_id`    | uuid                     | ya    |                                 |
| `actor_name`  | text                     | ya    |                                 |
| `from_status` | surat_keluar_status      | ya    |                                 |
| `to_status`   | surat_keluar_status      | ya    |                                 |
| `note`        | text                     | ya    |                                 |
| `created_at`  | timestamp with time zone | tidak | default `now()`                 |

- FK: `surat_id` → `surat_keluar.id` (cascade); `actor_id` → `profiles.id` (set null)
- indeks: `surat_approval_logs_surat_idx`

### `templates`

Template dokumen; file di bucket `templates`.

| Kolom         | Tipe                     | Null  | Default / Keterangan            |
| ------------- | ------------------------ | ----- | ------------------------------- |
| `id`          | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `name`        | text                     | tidak |                                 |
| `category`    | text                     | tidak |                                 |
| `description` | text                     | ya    |                                 |
| `file_path`   | text                     | tidak |                                 |
| `file_name`   | text                     | ya    |                                 |
| `file_size`   | bigint                   | ya    |                                 |
| `uploaded_by` | uuid                     | ya    |                                 |
| `created_at`  | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`  | timestamp with time zone | tidak | default `now()`                 |

- FK: `uploaded_by` → `profiles.id` (set null)
- indeks: `templates_category_idx`

### `invoices`

Tagihan. `status` kolom turunan dari `paid_amount`/`amount`.

| Kolom          | Tipe                     | Null  | Default / Keterangan                                                                                                  |
| -------------- | ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------- |
| `id`           | uuid                     | tidak | PK; default `gen_random_uuid()`                                                                                       |
| `invoice_no`   | text                     | tidak |                                                                                                                       |
| `client_id`    | uuid                     | ya    |                                                                                                                       |
| `case_id`      | uuid                     | ya    |                                                                                                                       |
| `description`  | text                     | ya    |                                                                                                                       |
| `amount`       | bigint                   | tidak |                                                                                                                       |
| `paid_amount`  | bigint                   | tidak | default `0`                                                                                                           |
| `invoice_date` | date                     | tidak | default `now()`                                                                                                       |
| `due_date`     | date                     | ya    |                                                                                                                       |
| `paid_date`    | date                     | ya    |                                                                                                                       |
| `status`       | text                     | tidak | generated: (case when paid_amount <= 0 then 'Belum Bayar' when paid_amount < amount then 'Sebagian' else 'Lunas' end) |
| `created_by`   | uuid                     | ya    |                                                                                                                       |
| `created_at`   | timestamp with time zone | tidak | default `now()`                                                                                                       |
| `updated_at`   | timestamp with time zone | tidak | default `now()`                                                                                                       |

- unik `invoices_invoice_no_unique`: invoice_no
- check `invoices_amount_positive`
- check `invoices_paid_nonneg`
- check `invoices_client_or_case`
- FK: `client_id` → `clients.id` (restrict); `case_id` → `cases.id` (restrict); `created_by` → `profiles.id` (set null)
- indeks: `invoices_client_idx`, `invoices_case_idx`, `invoices_status_idx`, `invoices_date_idx`

### `honor_tim`

Honor anggota tim per perkara; anggota hanya boleh melihat `published_amount`.

| Kolom              | Tipe                     | Null  | Default / Keterangan            |
| ------------------ | ------------------------ | ----- | ------------------------------- |
| `id`               | uuid                     | tidak | PK; default `gen_random_uuid()` |
| `case_id`          | uuid                     | tidak |                                 |
| `user_id`          | uuid                     | tidak |                                 |
| `draft_amount`     | bigint                   | tidak | default `0`                     |
| `published_amount` | bigint                   | ya    |                                 |
| `published_at`     | timestamp with time zone | ya    |                                 |
| `status`           | honor_status             | tidak | default `'Belum'`               |
| `paid_at`          | timestamp with time zone | ya    |                                 |
| `created_at`       | timestamp with time zone | tidak | default `now()`                 |
| `updated_at`       | timestamp with time zone | tidak | default `now()`                 |

- unik `honor_tim_case_user_uq`: case_id, user_id
- check `honor_tim_draft_nonneg`
- check `honor_tim_published_nonneg`
- FK: `case_id` → `cases.id` (cascade); `user_id` → `profiles.id` (restrict)
- indeks: `honor_tim_user_idx`, `honor_tim_status_idx`
