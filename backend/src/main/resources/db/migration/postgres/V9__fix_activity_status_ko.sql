-- Fix allowed values for sales_activity.activity_status to correct activity statuses
-- Allow both Korean labels (계획/완료/취소/연기/미방문) and legacy English values

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

-- Add correct status set (activity-level)
ALTER TABLE public.sales_activity
  ADD CONSTRAINT ck_sales_activity_status_ko
  CHECK (activity_status IN (
    -- Korean activity statuses
    '계획','완료','취소','연기','미방문',
    -- Legacy English statuses for compatibility
    'scheduled','completed','canceled','postponed','no_show'
  ));

