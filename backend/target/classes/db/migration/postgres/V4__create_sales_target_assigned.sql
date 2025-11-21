-- Create employee target assignment table (Postgres)
CREATE TABLE IF NOT EXISTS public.sales_target_assigned (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_year DATE NOT NULL,
  emp_seq BIGINT NULL,
  emp_name TEXT NOT NULL,
  company_name VARCHAR(16) NOT NULL,
  target_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  target_stage VARCHAR(16) NULL,
  created_by BIGINT NULL,
  updated_by BIGINT NULL
);

-- Ensure logical key uniqueness for upsert logic
CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_target_assigned_key
  ON public.sales_target_assigned (target_year, emp_name, company_name);

