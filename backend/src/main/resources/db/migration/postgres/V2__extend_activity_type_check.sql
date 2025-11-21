-- Extend allowed values for sales_activity.activity_type to include new codes
-- Screens now send: site_visit, opportunity, AR_mgmt
-- Keep existing allowed set for backward compatibility

ALTER TABLE public.sales_activity
  DROP CONSTRAINT IF EXISTS sales_activity_activity_type_check;

ALTER TABLE public.sales_activity
  ADD CONSTRAINT sales_activity_activity_type_check
  CHECK (
    activity_type IN (
      'meeting','call','email','demo','site_visit','task','other',
      'opportunity','AR_mgmt'
    )
  );

