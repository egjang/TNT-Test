-- Allow Korean values for sales_activity.activity_type while keeping legacy English codes

DO $$
DECLARE r RECORD;
BEGIN
  -- Drop existing CHECK constraints on sales_activity that reference activity_type
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'sales_activity'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%activity_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.sales_activity DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.sales_activity
  ADD CONSTRAINT ck_sales_activity_type_ko
  CHECK (activity_type IN (
    -- Korean labels
    '정기방문','영업기회','채권관리','미팅','전화','이메일','데모','업무','기타',
    -- Legacy english codes (kept for backward compatibility)
    'meeting','call','email','demo','site_visit','task','other','opportunity','AR_mgmt'
  ));

