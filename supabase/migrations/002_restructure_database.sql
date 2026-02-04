-- ============================================================================
-- COFFEE FARMING DATABASE - MIGRATION SCRIPTS
-- ============================================================================
-- Purpose: Restructure database with proper foreign key relationships
-- Author: Tân Cao Nguyên Development Team
-- Date: 2026-02-04
-- 
-- IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING THESE SCRIPTS!
-- ============================================================================

-- ============================================================================
-- STEP 0: CLEANUP (Fresh Start)
-- ============================================================================
-- Drop views first
DROP VIEW IF EXISTS v_farmer_complete;
DROP VIEW IF EXISTS v_model_activities;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS training_records CASCADE;
DROP TABLE IF EXISTS annual_activities CASCADE;
DROP TABLE IF EXISTS coffee_models CASCADE;
DROP TABLE IF EXISTS farm_baselines CASCADE;
DROP TABLE IF EXISTS farmers CASCADE;
DROP TABLE IF EXISTS tree_support CASCADE; -- Legacy table

-- Drop backups if they exist query
DROP TABLE IF EXISTS farm_baselines_backup;
DROP TABLE IF EXISTS coffee_models_backup;
DROP TABLE IF EXISTS annual_activities_backup;
DROP TABLE IF EXISTS financial_records_backup;
DROP TABLE IF EXISTS training_records_backup;
DROP TABLE IF EXISTS tree_support_backup;

-- ============================================================================
-- STEP 1: CREATE NEW FARMERS TABLE (Master Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS farmers (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Thông tin cơ bản
  farmer_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('Nam', 'Nữ', 'Khác')),
  date_of_birth DATE,
  id_card VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Địa chỉ
  village VARCHAR(255),
  commune VARCHAR(255),
  district VARCHAR(255),
  province VARCHAR(255) DEFAULT 'Đắk Lắk',
  
  -- Thông tin gia đình
  household_members INTEGER DEFAULT 1,
  household_head BOOLEAN DEFAULT true,
  
  -- Trạng thái tham gia
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Ghi chú
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for farmers
CREATE INDEX IF NOT EXISTS idx_farmers_code ON farmers(farmer_code);
CREATE INDEX IF NOT EXISTS idx_farmers_village ON farmers(village);
CREATE INDEX IF NOT EXISTS idx_farmers_status ON farmers(status);
CREATE INDEX IF NOT EXISTS idx_farmers_created_by ON farmers(created_by);
CREATE INDEX IF NOT EXISTS idx_farmers_full_name ON farmers(full_name);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_farmers_updated_at ON farmers;
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE farmers IS 'Bảng cha chính - Danh sách hộ nông dân tham gia chương trình';

-- ============================================================================
-- STEP 2: MIGRATE DATA FROM farm_baselines TO farmers
-- ============================================================================
-- Insert unique farmers from farm_baselines
-- Insert unique farmers from farm_baselines via profiles
-- ============================================================================
-- STEP 2: [SKIPPED] MIGRATE DATA (Clean Install)
-- ============================================================================
-- INSERT INTO farmers ... (User has no data)

-- ============================================================================
-- STEP 3: BACKUP AND RECREATE farm_baselines WITH FOREIGN KEY
-- ============================================================================
-- Backup old data
-- Backup already done in Step 0
-- CREATE TABLE IF NOT EXISTS farm_baselines_backup AS SELECT * FROM farm_baselines;

-- Drop old table
DROP TABLE IF EXISTS farm_baselines CASCADE;

-- Create new farm_baselines with proper structure
CREATE TABLE farm_baselines (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key to farmers
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  
  -- Thông tin trang trại
  farm_code VARCHAR(50) UNIQUE,
  farm_name VARCHAR(255),
  
  -- Diện tích
  total_area NUMERIC(10, 2),
  coffee_area NUMERIC(10, 2),
  intercrop_area NUMERIC(10, 2),
  intercrop_details TEXT,
  
  -- Vị trí
  gps_lat NUMERIC(10, 6),
  gps_long NUMERIC(10, 6),
  elevation NUMERIC(8, 2),
  
  -- Đất đai
  soil_type VARCHAR(100),
  soil_ph NUMERIC(4, 2),
  slope VARCHAR(50) CHECK (slope IN ('flat', 'gentle', 'moderate', 'steep')),
  
  -- Nước
  water_source VARCHAR(100),
  irrigation_system VARCHAR(100),
  
  -- Thảm phủ
  grass_cover VARCHAR(100),
  shade_trees INTEGER DEFAULT 0,
  
  -- Ghi chú
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_coffee_area CHECK (coffee_area IS NULL OR coffee_area <= total_area),
  CONSTRAINT check_intercrop_area CHECK (intercrop_area IS NULL OR intercrop_area <= total_area),
  CONSTRAINT check_total_area_positive CHECK (total_area IS NULL OR total_area > 0)
);

-- Indexes for farm_baselines
CREATE INDEX IF NOT EXISTS idx_farm_farmer ON farm_baselines(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farm_code ON farm_baselines(farm_code);
CREATE INDEX IF NOT EXISTS idx_farm_location ON farm_baselines(gps_lat, gps_long);

DROP TRIGGER IF EXISTS update_farm_baselines_updated_at ON farm_baselines;
CREATE TRIGGER update_farm_baselines_updated_at BEFORE UPDATE ON farm_baselines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE farm_baselines IS 'Bảng con của farmers - Thông tin chi tiết về trang trại/lô đất';

-- Data migration skipped for clean install

-- ============================================================================
-- STEP 4: UPDATE coffee_models TABLE
-- ============================================================================
-- Backup
-- Backup already done in Step 0
-- CREATE TABLE IF NOT EXISTS coffee_models_backup AS SELECT * FROM coffee_models;

DROP TABLE IF EXISTS coffee_models CASCADE;

CREATE TABLE coffee_models (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farm_baselines(id) ON DELETE SET NULL,
  
  -- Thông tin mô hình
  model_code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  coffee_type VARCHAR(100) CHECK (coffee_type IN ('Arabica', 'Robusta', 'Mixed', 'Other')),
  variety VARCHAR(100),
  
  -- Diện tích và quy mô
  area NUMERIC(10, 2),
  tree_count INTEGER,
  planting_year INTEGER,
  tree_age INTEGER,
  
  -- Vị trí
  location VARCHAR(255),
  
  -- Trạng thái
  adaptation_status VARCHAR(100) DEFAULT 'planning' 
    CHECK (adaptation_status IN ('planning', 'implementing', 'monitoring', 'completed', 'suspended')),
  last_inspection DATE,
  
  -- Ghi chú
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_farmer ON coffee_models(farmer_id);
CREATE INDEX IF NOT EXISTS idx_model_farm ON coffee_models(farm_id);
CREATE INDEX IF NOT EXISTS idx_model_code ON coffee_models(model_code);
CREATE INDEX IF NOT EXISTS idx_model_status ON coffee_models(adaptation_status);

DROP TRIGGER IF EXISTS update_coffee_models_updated_at ON coffee_models;
CREATE TRIGGER update_coffee_models_updated_at BEFORE UPDATE ON coffee_models
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE coffee_models IS 'Bảng con của farmers - Thông tin mô hình cà phê';

-- Data migration skipped for clean install

-- ============================================================================
-- STEP 5: CREATE training_records (Clean)
-- ============================================================================
-- No backup needed for clean install

CREATE TABLE training_records (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  
  -- Thông tin tập huấn
  training_code VARCHAR(50),
  training_date DATE NOT NULL,
  topic VARCHAR(255) NOT NULL,
  
  -- Chi tiết
  content TEXT,
  trainer VARCHAR(255),
  location VARCHAR(255),
  duration_hours NUMERIC(5, 2),
  
  -- Người tham gia
  participant_gender VARCHAR(10) CHECK (participant_gender IN ('Nam', 'Nữ')),
  participant_role VARCHAR(100),
  
  -- Đánh giá
  application_level VARCHAR(50) CHECK (application_level IN ('excellent', 'good', 'fair', 'poor')),
  feedback TEXT,
  certificate_issued BOOLEAN DEFAULT false,
  
  -- Ghi chú
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_farmer ON training_records(farmer_id);
CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date);
CREATE INDEX IF NOT EXISTS idx_training_topic ON training_records(topic);

DROP TRIGGER IF EXISTS update_training_records_updated_at ON training_records;
CREATE TRIGGER update_training_records_updated_at BEFORE UPDATE ON training_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE training_records IS 'Bảng con của farmers - Ghi nhận các khóa tập huấn';

-- Data migration skipped for clean install

-- ============================================================================
-- STEP 6: CREATE annual_activities (Clean)
-- ============================================================================
-- No backup needed for clean install

CREATE TABLE annual_activities (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  model_id UUID NOT NULL REFERENCES coffee_models(id) ON DELETE CASCADE,
  
  -- Thông tin hoạt động
  activity_code VARCHAR(50),
  activity_date DATE NOT NULL,
  activity_type VARCHAR(100) NOT NULL 
    CHECK (activity_type IN (
      'fertilizer', 'pesticide', 'pruning', 'harvesting', 
      'tree_support', 'weeding', 'irrigation', 'soil_management', 'other'
    )),
  
  -- Chi tiết hoạt động chung
  description TEXT,
  
  -- Cho phân bón / thuốc trừ sâu
  material_name VARCHAR(255),
  amount NUMERIC(10, 2),
  unit VARCHAR(50),
  
  -- Thuốc trừ sâu
  gcp_compliant BOOLEAN DEFAULT true,
  phi_days INTEGER,
  
  -- Hỗ trợ cây giống (merged from tree_support)
  tree_species VARCHAR(100),
  tree_quantity INTEGER,
  tree_quality VARCHAR(50) CHECK (tree_quality IN ('excellent', 'good', 'fair', 'poor')),
  survival_rate NUMERIC(5, 2) CHECK (survival_rate >= 0 AND survival_rate <= 100),
  estimated_value NUMERIC(12, 2),
  
  -- Lý do / Ghi chú
  reason TEXT,
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_model ON annual_activities(model_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON annual_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_date ON annual_activities(activity_date);

DROP TRIGGER IF EXISTS update_annual_activities_updated_at ON annual_activities;
CREATE TRIGGER update_annual_activities_updated_at BEFORE UPDATE ON annual_activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE annual_activities IS 'Bảng con của coffee_models - Tất cả các hoạt động canh tác';

-- Data migration skipped for clean install

-- ============================================================================
-- STEP 8: CREATE financial_records (Clean)
-- ============================================================================
-- No backup needed for clean install

CREATE TABLE financial_records (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  model_id UUID NOT NULL REFERENCES coffee_models(id) ON DELETE CASCADE,
  
  -- Thông tin tài chính
  record_code VARCHAR(50),
  record_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL 
    CHECK (category IN ('input', 'labor', 'equipment', 'support', 'revenue', 'other')),
  transaction_type VARCHAR(50) DEFAULT 'expense' 
    CHECK (transaction_type IN ('expense', 'income')),
  
  -- Chi tiết
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity NUMERIC(10, 2),
  unit_price NUMERIC(12, 2),
  amount NUMERIC(12, 2) NOT NULL,
  
  -- Nguồn
  funding_source VARCHAR(100),
  
  -- Ghi chú
  notes TEXT,
  receipt_number VARCHAR(100),
  
  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_model ON financial_records(model_id);
CREATE INDEX IF NOT EXISTS idx_financial_category ON financial_records(category);
CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_records(record_date);
CREATE INDEX IF NOT EXISTS idx_financial_type ON financial_records(transaction_type);

DROP TRIGGER IF EXISTS update_financial_records_updated_at ON financial_records;
CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON financial_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE financial_records IS 'Bảng con của coffee_models - Ghi nhận tài chính';

-- Data migration skipped for clean install

-- ============================================================================
-- STEP 9: CREATE VIEWS FOR EASY QUERYING
-- ============================================================================
-- View: Complete farmer information with all related data
CREATE OR REPLACE VIEW v_farmer_complete AS
SELECT 
  f.id as farmer_id,
  f.farmer_code,
  f.full_name,
  f.gender,
  f.village,
  f.status,
  COUNT(DISTINCT fb.id) as farm_count,
  COUNT(DISTINCT cm.id) as model_count,
  COUNT(DISTINCT tr.id) as training_count,
  SUM(fb.total_area) as total_farm_area,
  SUM(fb.coffee_area) as total_coffee_area
FROM farmers f
LEFT JOIN farm_baselines fb ON fb.farmer_id = f.id
LEFT JOIN coffee_models cm ON cm.farmer_id = f.id
LEFT JOIN training_records tr ON tr.farmer_id = f.id
GROUP BY f.id;

-- View: Model activities summary
CREATE OR REPLACE VIEW v_model_activities AS
SELECT 
  cm.id as model_id,
  cm.model_code,
  cm.name as model_name,
  f.farmer_code,
  f.full_name as farmer_name,
  COUNT(DISTINCT aa.id) as activity_count,
  COUNT(DISTINCT CASE WHEN aa.activity_type = 'tree_support' THEN aa.id END) as tree_support_count,
  SUM(CASE WHEN aa.activity_type = 'tree_support' THEN aa.tree_quantity ELSE 0 END) as total_trees_supported
FROM coffee_models cm
JOIN farmers f ON f.id = cm.farmer_id
LEFT JOIN annual_activities aa ON aa.model_id = cm.id
GROUP BY cm.id, f.id;

-- ============================================================================
-- STEP 10: GRANT PERMISSIONS (adjust as needed)
-- ============================================================================
-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON farmers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON farm_baselines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coffee_models TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON annual_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON training_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_records TO authenticated;

-- Grant view access
GRANT SELECT ON v_farmer_complete TO authenticated;
GRANT SELECT ON v_model_activities TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Check data migration success
SELECT 'farmers' as table_name, COUNT(*) as record_count FROM farmers
UNION ALL
SELECT 'farm_baselines', COUNT(*) FROM farm_baselines
UNION ALL
SELECT 'coffee_models', COUNT(*) FROM coffee_models
UNION ALL
SELECT 'annual_activities', COUNT(*) FROM annual_activities
UNION ALL
SELECT 'training_records', COUNT(*) FROM training_records
UNION ALL
SELECT 'financial_records', COUNT(*) FROM financial_records;

-- Check foreign key relationships
SELECT 
  f.farmer_code,
  COUNT(DISTINCT fb.id) as farms,
  COUNT(DISTINCT cm.id) as models,
  COUNT(DISTINCT tr.id) as trainings
FROM farmers f
LEFT JOIN farm_baselines fb ON fb.farmer_id = f.id
LEFT JOIN coffee_models cm ON cm.farmer_id = f.id
LEFT JOIN training_records tr ON tr.farmer_id = f.id
GROUP BY f.id, f.farmer_code
ORDER BY f.farmer_code;

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
