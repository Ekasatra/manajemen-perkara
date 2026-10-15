-- B2: penomoran atomik. Satu statement = satu row-lock, aman untuk panggilan paralel.
-- Dipanggil aplikasi (service role) dengan kunci seperti 'REG/2026', 'SM/2026', 'INV/2026', 'KL'.
CREATE OR REPLACE FUNCTION public.next_counter(p_key text)
RETURNS integer
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  INSERT INTO public.counters AS c (key, value) VALUES (p_key, 1)
  ON CONFLICT (key) DO UPDATE SET value = c.value + 1, updated_at = now()
  RETURNING c.value;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.next_counter(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.next_counter(text) TO service_role;
--> statement-breakpoint

-- B6: trigger updated_at, dipasang otomatis di setiap tabel public yang punya kolom updated_at.
-- Tabel baru yang punya updated_at harus menambahkan trigger-nya di migrasi masing-masing.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updated_at'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'trg_' || t || '_updated_at', t
    );
  END LOOP;
END
$$;
--> statement-breakpoint

-- B6: ringkasan tagihan per perkara (semua perkara muncul; tanpa invoice → 0).
CREATE VIEW public.v_case_billing WITH (security_invoker = true) AS
SELECT
  c.id AS case_id,
  count(i.id)::integer AS invoice_count,
  coalesce(sum(i.amount), 0)::bigint AS total_amount,
  coalesce(sum(i.paid_amount), 0)::bigint AS paid_amount,
  coalesce(sum(greatest(i.amount - i.paid_amount, 0)), 0)::bigint AS outstanding_amount
FROM public.cases c
LEFT JOIN public.invoices i ON i.case_id = c.id
GROUP BY c.id;
