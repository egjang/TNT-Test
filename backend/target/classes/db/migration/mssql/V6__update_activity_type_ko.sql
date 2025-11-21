-- Allow Korean values for sales_activity.activity_type in MSSQL while keeping legacy codes

IF OBJECT_ID('dbo.sales_activity','U') IS NOT NULL
BEGIN
  DECLARE @schema sysname = 'dbo';
  DECLARE @table sysname = 'sales_activity';

  -- Drop existing constraints that reference activity_type
  DECLARE @sql nvarchar(max);
  DECLARE cur CURSOR FOR
    SELECT 'ALTER TABLE ['+@schema+'].['+@table+'] DROP CONSTRAINT ['+cc.name+']'
    FROM sys.check_constraints cc
    JOIN sys.columns col ON col.object_id = cc.parent_object_id
    WHERE cc.parent_object_id = OBJECT_ID(@schema + '.' + @table)
      AND cc.definition LIKE '%activity_type%';
  OPEN cur;
  FETCH NEXT FROM cur INTO @sql;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    EXEC sp_executesql @sql;
    FETCH NEXT FROM cur INTO @sql;
  END
  CLOSE cur; DEALLOCATE cur;

  -- Add new check constraint allowing Korean and legacy values
  ALTER TABLE [dbo].[sales_activity]
    WITH NOCHECK ADD CONSTRAINT [ck_sales_activity_type_ko]
    CHECK ([activity_type] IN (
      N'정기방문',N'영업기회',N'채권관리',N'미팅',N'전화',N'이메일',N'데모',N'업무',N'기타',
      N'meeting',N'call',N'email',N'demo',N'site_visit',N'task',N'other',N'opportunity',N'AR_mgmt'
    ));
END

