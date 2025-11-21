-- Ensure assigned_amount column exists and migrate from target_amount if present (MS SQL Server)
IF COL_LENGTH('dbo.sales_target_assigned', 'assigned_amount') IS NULL
BEGIN
  ALTER TABLE dbo.sales_target_assigned ADD assigned_amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_assigned_amount DEFAULT 0 WITH VALUES;
END

IF COL_LENGTH('dbo.sales_target_assigned', 'target_amount') IS NOT NULL
BEGIN
  UPDATE dbo.sales_target_assigned
    SET assigned_amount = ISNULL(assigned_amount, 0) + ISNULL(target_amount, 0);
END

