-- ============================================================================
-- FIX: ENABLE PUBLIC ACCESS (ANON)
-- Purpose: allow data to be seen without logging in (Development Mode)
-- ============================================================================

-- 1. Farmers
DROP POLICY IF EXISTS "Allow public select" ON farmers;
CREATE POLICY "Allow public select" ON farmers FOR SELECT TO anon USING (true);

-- 2. Farm Baselines
DROP POLICY IF EXISTS "Allow public select" ON farm_baselines;
CREATE POLICY "Allow public select" ON farm_baselines FOR SELECT TO anon USING (true);

-- 3. Coffee Models
DROP POLICY IF EXISTS "Allow public select" ON coffee_models;
CREATE POLICY "Allow public select" ON coffee_models FOR SELECT TO anon USING (true);

-- 4. Annual Activities
DROP POLICY IF EXISTS "Allow public select" ON annual_activities;
CREATE POLICY "Allow public select" ON annual_activities FOR SELECT TO anon USING (true);

-- 5. Training Records
DROP POLICY IF EXISTS "Allow public select" ON training_records;
CREATE POLICY "Allow public select" ON training_records FOR SELECT TO anon USING (true);

-- 6. Financial Records
DROP POLICY IF EXISTS "Allow public select" ON financial_records;
CREATE POLICY "Allow public select" ON financial_records FOR SELECT TO anon USING (true);

-- Grant usage (just in case)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Refresh permissions
NOTIFY pgrst, 'reload config';
