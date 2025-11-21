-- Update allowed values for sales_activity.activity_status to new Korean labels
-- Drop existing constraint if present, then add a new named check constraint

DO $$
DECLARE r RECORD;
BEGIN
  -- Drop existing CHECK constraints on sales_activity that reference activity_status
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'sales_activity'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%activity_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.sales_activity DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Allow both legacy English statuses and new Korean statuses to avoid failures on existing data
ALTER TABLE public.sales_activity
  ADD CONSTRAINT ck_sales_activity_status_ko
  CHECK (activity_status IN (
    -- New set
    '신규등록','자격미달','접촉 중','영업접촉 중','전환성공','전환실패',
    -- Legacy set (kept for backward compatibility and smooth migration)
    'scheduled','completed','canceled','postponed','no_show'
  ));
