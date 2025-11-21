-- Add version_no to sales_target_assigned and update unique index (MS SQL Server)
IF COL_LENGTH('dbo.sales_target_assigned', 'version_no') IS NULL
BEGIN
  ALTER TABLE dbo.sales_target_assigned ADD version_no INT NOT NULL CONSTRAINT DF_sales_target_assigned_version DEFAULT 1 WITH VALUES;
END

-- Drop old unique index and create new including version_no
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_sales_target_assigned_key' AND object_id = OBJECT_ID('dbo.sales_target_assigned'))
BEGIN
  DROP INDEX ux_sales_target_assigned_key ON dbo.sales_target_assigned;
END

CREATE UNIQUE INDEX ux_sales_target_assigned_key
  ON dbo.sales_target_assigned (target_year, emp_name, company_name, version_no);

