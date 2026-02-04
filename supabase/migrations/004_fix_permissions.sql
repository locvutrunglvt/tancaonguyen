-- ============================================================================
-- FIX PERMISSIONS & RLS POLICIES
-- Purpose: Ensure frontend has access to data via Supabase API
-- ============================================================================

-- 1. Enable RLS on all tables (Standard Supabase Practice)
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- 2. Create "Select All" Policies for Authenticated Users
-- (Adjust to 'true' to allow all authenticated users to view/edit for now)

-- Farmers
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON farmers;
CREATE POLICY "Enable all access for authenticated users" ON farmers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Farm Baselines
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON farm_baselines;
CREATE POLICY "Enable all access for authenticated users" ON farm_baselines
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Coffee Models
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON coffee_models;
CREATE POLICY "Enable all access for authenticated users" ON coffee_models
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Annual Activities
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON annual_activities;
CREATE POLICY "Enable all access for authenticated users" ON annual_activities
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Training Records
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON training_records;
CREATE POLICY "Enable all access for authenticated users" ON training_records
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Financial Records
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON financial_records;
CREATE POLICY "Enable all access for authenticated users" ON financial_records
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Grant Permissions to 'anon' (Optional, if public view is needed, currently disabled)
-- GRANT SELECT ON farmers TO anon; 

-- 4. Verify Grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Force refresh schema cache
NOTIFY pgrst, 'reload config';
