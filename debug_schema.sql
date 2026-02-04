-- Helper to check columns
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('farm_baselines', 'farm_baselines_backup')
ORDER BY 
    table_name, column_name;

-- Check row counts
SELECT 'farm_baselines' as table_name, COUNT(*) FROM farm_baselines
UNION ALL
SELECT 'farm_baselines_backup', COUNT(*) FROM farm_baselines_backup;
