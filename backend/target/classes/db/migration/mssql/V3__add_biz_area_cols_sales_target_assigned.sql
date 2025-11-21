-- Add biz area columns for assignment details (MS SQL Server)
IF COL_LENGTH('dbo.sales_target_assigned', 'biz_area_group') IS NULL
BEGIN
  ALTER TABLE dbo.sales_target_assigned ADD biz_area_group NVARCHAR(50) NULL;
END
IF COL_LENGTH('dbo.sales_target_assigned', 'biz_area_name') IS NULL
BEGIN
  ALTER TABLE dbo.sales_target_assigned ADD biz_area_name NVARCHAR(100) NULL;
END

