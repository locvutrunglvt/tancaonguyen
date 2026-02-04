-- ============================================================================
-- SEED DATA: FARMER A NƯR
-- Cập nhật từ file: Giải pháp kỹ thuật vườn Demo: Vườn ANưr năm 2024
-- ============================================================================

DO $$
DECLARE
    -- Variables for IDs
    v_farmer_id UUID;
    v_farm_id UUID;
    v_model_id UUID;
    
    -- DATA FROM PDF REQUEST --------------------------------------------------
    -- 1. Farmer Info
    v_farmer_code TEXT := 'FAR-ANUR-2024'; 
    v_full_name TEXT := 'A Nưr';
    v_village TEXT := 'Thôn Groi Wet; Xã Glar; Huyện Dak Doa; Gia Lai';
    v_gender TEXT := 'Nam'; 
    
    -- 2. Farm Info
    v_farm_code TEXT := 'FARM-ANUR-01';  
    v_total_area NUMERIC := 0.51;             -- Tổng diện tích (ha)
    v_coffee_area NUMERIC := 0.51;            -- Diện tích cà phê (ha)
    -- Tọa độ giả định: 14.0042, 108.1234
    v_gps_lat NUMERIC := 14.0042;
    v_gps_long NUMERIC := 108.1234;
    v_soil_ph NUMERIC := 6.45;                -- pH đất
    v_intercrop_details TEXT := 'Sầu riêng (40 cây), Mắc ca (39 cây), Muồng hoa vàng';
    
    -- 3. Model Info
    v_model_code TEXT := 'MDL-ANUR-COFFEE';
    v_model_name TEXT := 'Vườn Demo A Nưr 2024';
    v_coffee_type TEXT := 'Robusta';          -- Fixed: Must be one of (Arabica, Robusta, Mixed, Other)
    v_variety TEXT := 'Thiện Trường hoặc TR13'; -- Moves to variety column
    v_tree_count INTEGER := 490;              -- Tổng 140 cây đã trồng + 350 cây chưa trồng 
    v_planting_year INTEGER := 2024;
    v_model_notes TEXT := '140 cây cũ trồng quá sâu cần trồng lại. pH đất 6.45.';
    
    -- 4. Activity Info
    v_activity_date DATE := '2024-01-01';     -- Năm triển khai 2024
    v_tree_support_qty INTEGER := 350;        -- Số cây giống hỗ trợ
    v_fertilizer_notes TEXT := 'Đã cập nhật bảng lượng phân Urea và Kali cho 500 cây qua 3 đợt bón.';
    ---------------------------------------------------------------------------

BEGIN
    -- 1. Insert Farmer =======================================================
    INSERT INTO farmers (farmer_code, full_name, gender, village, status)
    VALUES (v_farmer_code, v_full_name, v_gender, v_village, 'active')
    ON CONFLICT (farmer_code) 
    DO UPDATE SET 
        full_name = EXCLUDED.full_name, 
        village = EXCLUDED.village
    RETURNING id INTO v_farmer_id;
    
    RAISE NOTICE 'Farmer ID: %', v_farmer_id;

    -- 2. Insert Farm Baseline ================================================
    INSERT INTO farm_baselines (
        farmer_id, farm_code, total_area, coffee_area, 
        gps_lat, gps_long, soil_ph, intercrop_details, notes
    )
    VALUES (
        v_farmer_id, v_farm_code, v_total_area, v_coffee_area, 
        v_gps_lat, v_gps_long, v_soil_ph, v_intercrop_details, 'Dữ liệu từ PDF Giải pháp kỹ thuật'
    )
    ON CONFLICT (farm_code) 
    DO UPDATE SET 
        total_area = EXCLUDED.total_area,
        soil_ph = EXCLUDED.soil_ph,
        intercrop_details = EXCLUDED.intercrop_details
    RETURNING id INTO v_farm_id;
    
    -- Fallback if already exists
    IF v_farm_id IS NULL THEN
        SELECT id INTO v_farm_id FROM farm_baselines WHERE farm_code = v_farm_code;
    END IF;

    -- 3. Insert Coffee Model =================================================
    INSERT INTO coffee_models (
        farmer_id, farm_id, model_code, name, 
        coffee_type, variety, tree_count, planting_year, adaptation_status, notes
    )
    VALUES (
        v_farmer_id, v_farm_id, v_model_code, v_model_name,
        v_coffee_type, v_variety, v_tree_count, v_planting_year, 'implementing', v_model_notes
    )
    ON CONFLICT (model_code) DO UPDATE SET 
        tree_count = EXCLUDED.tree_count,
        notes = EXCLUDED.notes
    RETURNING id INTO v_model_id;

    -- Fallback
    IF v_model_id IS NULL THEN
        SELECT id INTO v_model_id FROM coffee_models WHERE model_code = v_model_code;
    END IF;

    -- 4. Insert Activities ===================================================
    -- Check if activity already exists manually since no unique constraint
    IF NOT EXISTS (SELECT 1 FROM annual_activities WHERE activity_code = 'ACT-' || v_model_code || '-SUP-01') THEN
        INSERT INTO annual_activities (
            model_id, activity_code, activity_date, activity_type,
            tree_species, tree_quantity, survival_rate, reason, notes
        )
        VALUES (
        v_model_id, 
        'ACT-' || v_model_code || '-SUP-01', 
        v_activity_date, 
        'tree_support',
        v_variety,        -- Use variety name for tree species
        v_tree_support_qty,
        100,              -- Tỷ lệ sống giả định ban đầu
        'Hỗ trợ cây giống dự án',
        '330 cây trồng mới + dự phòng'
    );
    END IF;

    -- b) Note about Fertilizer (Log as 'other' activity for record)
    IF NOT EXISTS (SELECT 1 FROM annual_activities WHERE activity_code = 'ACT-' || v_model_code || '-NOTE-01') THEN
        INSERT INTO annual_activities (
        model_id, activity_code, activity_date, activity_type,
        description, notes
    )
    VALUES (
        v_model_id, 
        'ACT-' || v_model_code || '-NOTE-01', 
        v_activity_date, 
        'other',
        'Ghi chú phân bón',
        v_fertilizer_notes
    );
    END IF;

    RAISE NOTICE 'Import completed for A Nưr';
END $$;
