-- Add parent_activity_seq to support hierarchical activities and index

ALTER TABLE public.sales_activity
  ADD COLUMN IF NOT EXISTS parent_activity_seq BIGINT;

-- Optional FK to self (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_activity_parent_fk'
  ) THEN
    ALTER TABLE public.sales_activity
      ADD CONSTRAINT sales_activity_parent_fk
      FOREIGN KEY (parent_activity_seq)
      REFERENCES public.sales_activity(id);
  END IF;
END$$;

-- Index for lookups by parent
CREATE INDEX IF NOT EXISTS ix_sales_activity_parent ON public.sales_activity (parent_activity_seq);

