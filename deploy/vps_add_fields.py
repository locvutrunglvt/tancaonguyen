"""
Migration: Add missing fields for 9-layer data collection framework.
Patches existing PocketBase collections without destroying data.

9 Layers:
 1. Farmer Identity       → farmers
 2. Land & Legal          → land_plots
 3. Farm Structure        → land_plots
 4. Soil & Fertility      → land_plots
 5. Water & Irrigation    → land_plots
 6. Crop Protection       → land_plots
 7. Production & Yield    → income_records
 8. Compliance & Traceability → land_plots + sustainability_certs
 9. Socio-economic        → farmers + household_members + income_records
"""
import sys, json, requests

sys.stdout.reconfigure(encoding="utf-8")

PB_URL   = "https://tcn.lvtcenter.it.com"
PB_EMAIL = "admin@lvtcenter.it.com"
PB_PASS  = "Admin12345#"
API      = f"{PB_URL}/api"
session  = requests.Session()

# ── Field builders ─────────────────────────────────────────────────────────────

def f_text(name, required=False):
    return {"type": "text", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False}

def f_number(name):
    return {"type": "number", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "min": None, "max": None, "onlyInt": False}

def f_bool(name):
    return {"type": "bool", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False}

def f_date(name):
    return {"type": "date", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "min": "", "max": ""}

def f_select(name, values):
    return {"type": "select", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "values": values, "maxSelect": 1}

def f_json(name):
    return {"type": "json", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "maxSize": 2000000}


# ── Auth ───────────────────────────────────────────────────────────────────────

def authenticate():
    print("=" * 65)
    print("  TCN – Add Missing Fields (9-Layer Framework)")
    print("=" * 65)
    for url in [
        f"{API}/collections/_superusers/auth-with-password",
        f"{API}/admins/auth-with-password",
    ]:
        r = session.post(url, json={"identity": PB_EMAIL, "password": PB_PASS})
        if r.status_code == 200:
            token = r.json().get("token", "")
            session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"[AUTH] OK\n")
            return
    print("[AUTH] FAILED"); sys.exit(1)


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_collection(name):
    r = session.get(f"{API}/collections/{name}")
    return r.json() if r.status_code == 200 else None

def patch_fields(coll_name, new_fields):
    """Add only fields that don't already exist. Returns (added_count, skip_count)."""
    coll = get_collection(coll_name)
    if not coll:
        print(f"  [{coll_name}] NOT FOUND – skipping")
        return 0, 0

    existing = {f["name"] for f in coll.get("fields", [])}
    to_add   = [f for f in new_fields if f["name"] not in existing]
    skipped  = len(new_fields) - len(to_add)

    if not to_add:
        print(f"  [{coll_name}] All {len(new_fields)} fields already exist – nothing to add")
        return 0, skipped

    merged = coll["fields"] + to_add
    r = session.patch(f"{API}/collections/{coll_name}", json={"fields": merged})
    if r.status_code == 200:
        added_names = [f["name"] for f in to_add]
        print(f"  [{coll_name}] Added {len(to_add)} fields: {', '.join(added_names)}")
        if skipped:
            print(f"            Skipped {skipped} already-existing fields")
        return len(to_add), skipped
    else:
        print(f"  [{coll_name}] ERROR {r.status_code}: {r.text[:300]}")
        return 0, skipped


# ── Field definitions by collection ───────────────────────────────────────────

def main():
    authenticate()

    # ── LAYER 1: Farmer Identity ──────────────────────────────────────────────
    # Collection: farmers
    # Category: Thông tin chung (General – collected once)
    print("[ LAYER 1 ] Farmer Identity → farmers")
    patch_fields("farmers", [
        f_select("marital_status", ["Độc thân", "Đã kết hôn", "Ly hôn", "Goá"]),
        f_date("id_card_issue_date"),        # Ngày cấp CCCD
        f_text("id_card_issue_place"),       # Nơi cấp CCCD
        # Layer 9 fields also belong to the farmer profile
        f_select("women_decision_role",      # Vai trò phụ nữ trong quyết định
                 ["Chủ yếu", "Cùng quyết định", "Không tham gia"]),
        f_bool("access_to_credit"),          # Tiếp cận vay vốn
        f_text("credit_source"),             # Nguồn vay vốn (ngân hàng, tổ chức tín dụng...)
    ])

    # ── LAYER 1 (cont): Household Members ─────────────────────────────────────
    # Collection: household_members
    # Category: Thông tin chung
    print("\n[ LAYER 1 ] Household Members → household_members")
    patch_fields("household_members", [
        f_text("occupation"),                # Nghề nghiệp chính
        f_select("income_contribution",      # Đóng góp thu nhập gia đình
                 ["Chính", "Phụ", "Không"]),
    ])

    # ── LAYERS 2-8: Land Plots ────────────────────────────────────────────────
    # Collection: land_plots
    # Category: Thông tin chung (all fields below are baseline/static info)
    print("\n[ LAYER 2 ] Land & Legal → land_plots")
    land_layer2 = [
        f_select("lurc_status",              # Sổ đỏ/GCNQSDĐ
                 ["Có sổ đỏ", "Đang làm sổ", "Chưa có sổ"]),
        f_text("lurc_number"),               # Số sổ đỏ
        f_date("lurc_issue_date"),           # Ngày cấp sổ đỏ
        f_number("lurc_area_ha"),            # Diện tích theo sổ (ha)
        f_number("gps_lat"),                 # Vĩ độ thửa đất
        f_number("gps_long"),                # Kinh độ thửa đất
        f_json("gps_polygon"),               # Tọa độ ranh giới thửa (GeoJSON)
        f_bool("satellite_verified"),        # Đã xác minh qua ảnh vệ tinh
        f_select("ownership_status",         # Hình thức sở hữu (chi tiết hơn ownership_type)
                 ["Sở hữu riêng", "Thuê mướn", "Mượn", "Cộng đồng"]),
    ]

    print("[ LAYER 3 ] Farm Structure → land_plots")
    land_layer3 = [
        f_text("coffee_variety"),            # Giống cà phê trên thửa
        f_number("planting_density"),        # Mật độ trồng (cây/ha)
        f_number("row_spacing_m"),           # Khoảng cách hàng (m)
        f_number("tree_spacing_m"),          # Khoảng cách cây trong hàng (m)
        f_number("tree_age_avg"),            # Tuổi cây trung bình (năm)
    ]

    print("[ LAYER 4 ] Soil & Fertility → land_plots")
    land_layer4 = [
        f_select("soil_type_plot",           # Loại đất (đất đỏ bazan, đất xám...)
                 ["Đất đỏ bazan", "Đất xám", "Đất thịt", "Đất cát", "Khác"]),
        f_number("soil_ph_plot"),            # pH đất thực đo tại thửa
        f_text("main_fertilizer_types"),     # Loại phân bón chính sử dụng
        f_select("fertilization_frequency", # Tần suất bón phân/năm
                 ["1 lần/năm", "2 lần/năm", "3 lần/năm", "Hơn 3 lần/năm"]),
        f_number("organic_input_pct"),       # Tỷ lệ phân hữu cơ (%)
    ]

    print("[ LAYER 5 ] Water & Irrigation → land_plots")
    land_layer5 = [
        f_select("water_source_plot",        # Nguồn nước tưới tại thửa
                 ["Giếng đào", "Giếng khoan", "Hồ/Suối", "Nước mưa", "Khác"]),
        f_select("irrigation_method",        # Phương pháp tưới
                 ["Phun mưa", "Nhỏ giọt", "Tưới gốc", "Không tưới"]),
        f_select("irrigation_frequency",     # Tần suất tưới
                 ["Hàng tuần", "2 tuần/lần", "Hàng tháng", "Theo nhu cầu"]),
        f_bool("water_storage"),             # Có bể/hồ chứa nước
    ]

    print("[ LAYER 6 ] Crop Protection → land_plots")
    land_layer6 = [
        f_text("main_pests"),                # Sâu hại chính thường gặp
        f_text("main_diseases"),             # Bệnh chính thường gặp
        f_bool("ipm_practiced"),             # Áp dụng quản lý sâu bệnh tổng hợp (IPM)
        f_bool("pesticide_certified"),       # Chỉ sử dụng thuốc trong danh mục được phép
    ]

    print("[ LAYER 7 ] Production & Yield → land_plots")
    land_layer7 = [
        f_select("harvest_method",           # Phương pháp thu hoạch
                 ["Thủ công", "Cơ giới", "Kết hợp"]),
        f_select("processing_method",        # Phương pháp chế biến
                 ["Chế biến ướt", "Chế biến khô", "Honey", "Bán sản phẩm tươi"]),
    ]

    print("[ LAYER 8 ] Compliance & Traceability → land_plots")
    land_layer8 = [
        f_select("eudr_status",              # Trạng thái tuân thủ EUDR
                 ["Tuân thủ", "Không tuân thủ", "Đang xem xét", "Chưa đánh giá"]),
        f_select("deforestation_risk",       # Mức độ rủi ro phá rừng
                 ["Thấp", "Trung bình", "Cao"]),
        f_text("traceability_code"),         # Mã truy xuất nguồn gốc
        f_bool("farm_map_verified"),         # Bản đồ trang trại đã được xác minh
    ]

    patch_fields("land_plots",
        land_layer2 + land_layer3 + land_layer4 +
        land_layer5 + land_layer6 + land_layer7 + land_layer8
    )

    # ── LAYER 7 & 9 (periodic): Income Records ────────────────────────────────
    # Collection: income_records
    # Category: Thông tin định kỳ (thu thập hàng năm)
    print("\n[ LAYER 7+9 ] Production & Socio-economic → income_records  [ĐỊNH KỲ/năm]")
    patch_fields("income_records", [
        # Layer 7 – production detail
        f_number("cherry_yield_tons"),       # Sản lượng cà phê tươi (tấn)
        f_number("green_bean_yield_tons"),   # Sản lượng nhân xanh (tấn)
        f_number("cherry_price_vnd"),        # Giá bán cà phê tươi (VNĐ/kg)
        f_number("yield_per_ha"),            # Năng suất (kg/ha)
        f_select("harvest_method_rec",       # Phương pháp thu hoạch (bản ghi năm)
                 ["Thủ công", "Cơ giới", "Kết hợp"]),
        f_select("processing_method_rec",    # Phương pháp chế biến (bản ghi năm)
                 ["Chế biến ướt", "Chế biến khô", "Honey", "Bán sản phẩm tươi"]),
        f_number("hired_labor_cost"),        # Chi phí thuê lao động ngoài
        # Layer 9 – labour structure
        f_number("female_labor_days"),       # Ngày công phụ nữ trong năm
        f_number("family_labor_days"),       # Ngày công lao động gia đình
        f_number("hired_labor_days"),        # Ngày công thuê ngoài
    ])

    # ── LAYER 8 (general): Sustainability Certs ───────────────────────────────
    # Collection: sustainability_certs
    # Category: Thông tin chung (hồ sơ chứng nhận)
    print("\n[ LAYER 8 ] Compliance & Traceability → sustainability_certs")
    patch_fields("sustainability_certs", [
        f_text("cert_number"),               # Số chứng nhận
        f_date("cert_issue_date"),           # Ngày cấp chứng nhận
        f_date("cert_expiry_date"),          # Ngày hết hạn chứng nhận
        f_text("cert_body"),                 # Tổ chức cấp chứng nhận
        f_bool("eudr_compliant"),            # Tuân thủ EUDR
        f_date("eudr_assessment_date"),      # Ngày đánh giá EUDR
        f_select("deforestation_risk_level", # Mức rủi ro phá rừng (do tổ chức đánh giá)
                 ["Thấp", "Trung bình", "Cao"]),
        f_text("traceability_chain"),        # Mô tả chuỗi truy xuất
    ])

    # ── LAYERS 4, 5, 8, 9 (periodic): Model Inspections ─────────────────────
    # Collection: model_inspections
    # Category: Thông tin kiểm tra thu thập định kỳ (quarterly/monthly)
    print("\n[ LAYERS 4,5,8,9 ] Periodic inspection → model_inspections  [ĐỊNH KỲ]")
    patch_fields("model_inspections", [
        # Layer 4 – soil sample during inspection
        f_number("soil_ph_sample"),          # Mẫu pH đất đo tại thời điểm kiểm tra
        f_text("fertilizer_applied"),        # Phân bón đã áp dụng trong kỳ
        # Layer 5 – irrigation status
        f_select("irrigation_adequacy",      # Đủ nước tưới trong kỳ?
                 ["Đủ nước", "Thiếu nước", "Dư nước"]),
        # Layer 8 – compliance check
        f_bool("eudr_check_passed"),         # Kiểm tra EUDR đạt yêu cầu
        f_bool("traceability_updated"),      # Hồ sơ truy xuất đã cập nhật
        # Layer 9 – women participation
        f_number("female_participation_pct"),# Tỷ lệ lao động nữ trong kỳ (%)
    ])

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("=" * 65)
    print("  DONE. Run this script again – it will skip existing fields.")
    print("=" * 65)
    print()
    print("  Collection summary:")
    for name in ["farmers", "household_members", "land_plots",
                 "income_records", "sustainability_certs", "model_inspections"]:
        c = get_collection(name)
        if c:
            n = len(c.get("fields", []))
            print(f"    {name:<26} {n} fields")


if __name__ == "__main__":
    main()
