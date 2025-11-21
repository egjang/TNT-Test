-- Add version_no to sales_target_assigned and update unique index (Postgres)
ALTER TABLE public.sales_target_assigned
  ADD COLUMN IF NOT EXISTS version_no INT NOT NULL DEFAULT 1;

-- Recreate unique index to include version_no
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ux_sales_target_assigned_key') THEN
    EXECUTE 'DROP INDEX public.ux_sales_target_assigned_key';
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_target_assigned_key
  ON public.sales_target_assigned (target_year, emp_name, company_name, version_no);

