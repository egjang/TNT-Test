-- Add biz area columns for assignment details (Postgres)
ALTER TABLE public.sales_target_assigned
  ADD COLUMN IF NOT EXISTS biz_area_group TEXT,
  ADD COLUMN IF NOT EXISTS biz_area_name TEXT;

