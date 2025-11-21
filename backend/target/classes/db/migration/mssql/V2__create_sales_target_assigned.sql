-- Create employee target assignment table (MS SQL Server)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sales_target_assigned' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.sales_target_assigned (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    target_year DATE NOT NULL,
    emp_seq BIGINT NULL,
    emp_name NVARCHAR(100) NOT NULL,
    company_name NVARCHAR(16) NOT NULL,
    target_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    target_stage NVARCHAR(16) NULL,
    created_by BIGINT NULL,
    updated_by BIGINT NULL
  );
END

-- Unique index for logical key
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_sales_target_assigned_key' AND object_id = OBJECT_ID('dbo.sales_target_assigned'))
BEGIN
  CREATE UNIQUE INDEX ux_sales_target_assigned_key
    ON dbo.sales_target_assigned (target_year, emp_name, company_name);
END

