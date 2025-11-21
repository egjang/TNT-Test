-- Fix allowed values for sales_activity.activity_status in MSSQL

IF OBJECT_ID('dbo.sales_activity','U') IS NOT NULL
BEGIN
  DECLARE @schema sysname = 'dbo';
  DECLARE @table sysname = 'sales_activity';

  -- Drop existing constraints that reference activity_status
  DECLARE @sql nvarchar(max);
  DECLARE cur CURSOR FOR
    SELECT 'ALTER TABLE ['+@schema+'].['+@table+'] DROP CONSTRAINT ['+cc.name+']'
    FROM sys.check_constraints cc
    JOIN sys.columns col ON col.object_id = cc.parent_object_id
    WHERE cc.parent_object_id = OBJECT_ID(@schema + '.' + @table)
      AND cc.definition LIKE '%activity_status%';
  OPEN cur;
  FETCH NEXT FROM cur INTO @sql;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    EXEC sp_executesql @sql;
    FETCH NEXT FROM cur INTO @sql;
  END
  CLOSE cur; DEALLOCATE cur;

  -- Add new check constraint with correct Korean statuses and legacy English values
  ALTER TABLE [dbo].[sales_activity]
    WITH NOCHECK ADD CONSTRAINT [ck_sales_activity_status_ko]
    CHECK ([activity_status] IN (
      N'계획',N'완료',N'취소',N'연기',N'미방문',
      N'scheduled',N'completed',N'canceled',N'postponed',N'no_show'
    ));
END

