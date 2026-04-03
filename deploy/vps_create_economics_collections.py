"""
Create new PocketBase collections for Tchibo Demo Farm Economics & Indicators.
Based on: 260323.Tchibo.Demo Farm Economics Consolidated Data Template.xlsx
          260311.Tchibo.Demo Indicators.xlsx

New collections:
  1. farm_background        – Annual tree count snapshot (coffee + intercrops by age)
  2. initial_investment     – One-time Year-0 establishment costs
  3. coffee_cost_entries    – Per-event coffee costs (labour + inputs, by round)
  4. intercrop_cost_entries – Per-event intercrop costs (labour + inputs, by round)
  5. revenue_entries        – Per-sale revenue with fresh-cherry unit conversion

All link to demo_models (and optionally to farmers).
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

def f_number(name, required=False):
    return {"type": "number", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False,
            "min": None, "max": None, "onlyInt": False}

def f_int(name, required=False):
    return {"type": "number", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False,
            "min": None, "max": None, "onlyInt": True}

def f_bool(name):
    return {"type": "bool", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False}

def f_date(name, required=False):
    return {"type": "date", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False,
            "min": "", "max": ""}

def f_select(name, values, required=False, max_select=1):
    return {"type": "select", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False,
            "values": values, "maxSelect": max_select}

def f_relation(name, collection_id, required=False, cascade_delete=False):
    return {"type": "relation", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False,
            "collectionId": collection_id, "cascadeDelete": cascade_delete,
            "maxSelect": 1, "minSelect": 0}

def f_json(name):
    return {"type": "json", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "maxSize": 2000000}

def f_autodate(name, on_create=True, on_update=False):
    return {"type": "autodate", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "onCreate": on_create, "onUpdate": on_update}

def autodate_fields():
    return [
        f_autodate("created", on_create=True, on_update=False),
        f_autodate("updated", on_create=True, on_update=True),
    ]


# ── Auth ───────────────────────────────────────────────────────────────────────

def authenticate():
    print("=" * 65)
    print("  TCN – Create Farm Economics Collections")
    print("=" * 65)
    for url in [
        f"{API}/collections/_superusers/auth-with-password",
        f"{API}/admins/auth-with-password",
    ]:
        r = session.post(url, json={"identity": PB_EMAIL, "password": PB_PASS})
        if r.status_code == 200:
            token = r.json().get("token", "")
            session.headers.update({"Authorization": f"Bearer {token}"})
            print("[AUTH] OK\n")
            return
    print("[AUTH] FAILED"); sys.exit(1)


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_collection(name):
    r = session.get(f"{API}/collections/{name}")
    return r.json() if r.status_code == 200 else None

def get_id(name):
    c = get_collection(name)
    return c["id"] if c else None

def collection_exists(name):
    return get_collection(name) is not None

def create_collection(name, fields):
    payload = {
        "name": name, "type": "base", "fields": fields,
        "listRule": "", "viewRule": "", "createRule": "",
        "updateRule": "", "deleteRule": "",
    }
    r = session.post(f"{API}/collections", json=payload)
    if r.status_code == 200:
        data = r.json()
        print(f"  [{name}] CREATED – id: {data['id']}, {len(data.get('fields',[]))} fields")
        return data["id"]
    else:
        print(f"  [{name}] ERROR {r.status_code}: {r.text[:300]}")
        return None


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    authenticate()

    # Resolve existing collection IDs
    print("[STEP 1] Resolving collection IDs...")
    DEMO_MODELS_ID = get_id("demo_models")
    FARMERS_ID     = get_id("farmers")
    USERS_ID       = get_id("users")
    print(f"  demo_models → {DEMO_MODELS_ID}")
    print(f"  farmers     → {FARMERS_ID}")
    print(f"  users       → {USERS_ID}")
    print()

    # ── 1. farm_background ────────────────────────────────────────────────────
    # Annual snapshot: farm size + tree count by species and age cohort.
    # One record per model per year.
    # Frequency: ANNUAL
    print("[STEP 2] Creating collections...")
    print("-" * 65)

    if collection_exists("farm_background"):
        print("  [farm_background] SKIPPED – already exists")
    else:
        create_collection("farm_background", [
            f_relation("model_id", DEMO_MODELS_ID, required=True,
                       cascade_delete=True) if DEMO_MODELS_ID else f_text("model_id"),
            f_int("year", required=True),          # Năm báo cáo
            f_number("farm_size_ha"),              # Tổng diện tích (ha)
            # Coffee trees by age cohort
            f_int("coffee_yr1"),                   # Số cây cà phê năm 1
            f_int("coffee_yr2"),                   # Số cây cà phê năm 2
            f_int("coffee_yr3"),                   # Số cây cà phê năm 3
            f_int("coffee_yr4"),                   # Số cây cà phê năm 4
            f_int("coffee_yr4plus"),               # Số cây cà phê trên 4 năm
            # Durian trees by age cohort
            f_int("durian_yr1"),
            f_int("durian_yr2"),
            f_int("durian_yr3"),
            f_int("durian_yr4"),
            f_int("durian_yr4plus"),
            # Macadamia trees by age cohort
            f_int("maca_yr1"),
            f_int("maca_yr2"),
            f_int("maca_yr3"),
            f_int("maca_yr4"),
            f_int("maca_yr4plus"),
            # Avocado trees by age cohort (extensible)
            f_int("avocado_yr1"),
            f_int("avocado_yr2"),
            f_int("avocado_yr3"),
            f_int("avocado_yr4"),
            f_int("avocado_yr4plus"),
            # Other intercrops (free-text for flexibility)
            f_text("intercrop5_name"),             # Tên cây xen canh khác
            f_int("intercrop5_total"),             # Tổng số cây
            f_text("notes"),
        ] + autodate_fields())

    # ── 2. initial_investment ────────────────────────────────────────────────
    # One-time Year-0 establishment costs per farmer model.
    # Labour (Manday) + Input (Kg/Liter/Tree) line items.
    # Frequency: ONE-TIME (Năm 0 / năm thiết lập mô hình)
    if collection_exists("initial_investment"):
        print("  [initial_investment] SKIPPED – already exists")
    else:
        create_collection("initial_investment", [
            f_relation("model_id", DEMO_MODELS_ID, required=True,
                       cascade_delete=True) if DEMO_MODELS_ID else f_text("model_id"),
            f_date("record_date"),                 # Ngày thực hiện
            f_select("investment_type",            # Loại đầu tư
                     ["Labour", "Input"], required=True),
            f_select("sub_type",                   # Nhóm hoạt động / vật tư
                     ["Clearance", "Hole preparation",
                      "Plant Coffee and Shade trees",
                      "Fertilizer", "Pesticide", "Weeding",
                      "Seedlings",
                      "Fertilizer application - R1",
                      "Fertilizer application - R2",
                      "Fertilizer application - R3",
                      "Pesticide application - R1",
                      "Pesticide application - R2"]),
            f_text("item"),                        # Tên hoạt động / vật tư cụ thể
            f_text("brand"),                       # Tên thương hiệu (nếu có)
            f_select("unit",                       # Đơn vị
                     ["Manday", "Kg", "Liter", "Tree", "Ha"]),
            f_number("quantity"),                  # Số lượng
            f_number("unit_price"),                # Đơn giá (VNĐ)
            f_number("total_cost"),                # Thành tiền (= qty × unit_price)
            f_text("remarks"),                     # Ghi chú
            f_relation("recorded_by", USERS_ID) if USERS_ID else f_text("recorded_by"),
        ] + autodate_fields())

    # ── 3. coffee_cost_entries ───────────────────────────────────────────────
    # Per-event coffee production costs (recurring across the crop year).
    # Split: Labour (Manday) and Input (Kg/Liter/Kwh) with round tracking.
    # Frequency: EVENT-BASED / PER ACTIVITY (tổng hợp thành báo cáo năm)
    if collection_exists("coffee_cost_entries"):
        print("  [coffee_cost_entries] SKIPPED – already exists")
    else:
        create_collection("coffee_cost_entries", [
            f_relation("model_id", DEMO_MODELS_ID, required=True,
                       cascade_delete=True) if DEMO_MODELS_ID else f_text("model_id"),
            f_date("record_date", required=True),  # Ngày ghi nhận
            f_int("crop_year"),                    # Năm vụ mùa (YYYY)
            f_select("cost_type",                  # Loại chi phí
                     ["Labour", "Input"], required=True),
            f_select("cost_subtype",               # Hoạt động canh tác
                     ["Irrigation", "Pruning", "Weeding",
                      "Fertilizer application", "Agro-chemical use",
                      "Harvest"]),
            f_select("allocated_round",            # Lần thực hiện trong năm
                     ["Round 1", "Round 2", "Round 3",
                      "Round 4", "Round 5"]),
            f_text("item"),                        # Tên vật tư / hoạt động
            f_text("brand"),                       # Tên thương hiệu
            f_select("unit",                       # Đơn vị
                     ["Manday", "Kg", "Liter", "Kwh"]),
            f_number("quantity"),                  # Số lượng
            f_number("unit_price"),                # Đơn giá (VNĐ)
            f_number("total_cost"),                # Thành tiền
            f_text("remarks"),
            f_relation("recorded_by", USERS_ID) if USERS_ID else f_text("recorded_by"),
        ] + autodate_fields())

    # ── 4. intercrop_cost_entries ────────────────────────────────────────────
    # Per-event intercrop costs — separate from coffee costs to avoid
    # double-counting shared fertilizer/chemical applications.
    # Frequency: EVENT-BASED / PER ACTIVITY
    if collection_exists("intercrop_cost_entries"):
        print("  [intercrop_cost_entries] SKIPPED – already exists")
    else:
        create_collection("intercrop_cost_entries", [
            f_relation("model_id", DEMO_MODELS_ID, required=True,
                       cascade_delete=True) if DEMO_MODELS_ID else f_text("model_id"),
            f_date("record_date", required=True),
            f_int("crop_year"),
            f_select("intercrop_type",             # Loại cây xen canh
                     ["Durian", "Macadamia", "Avocado", "Other"]),
            f_text("intercrop_name_other"),        # Tên khác nếu chọn "Other"
            f_select("cost_type",
                     ["Labour", "Input"], required=True),
            f_select("cost_subtype",               # Hoạt động (ít hơn cà phê — không có Irrigation/Weeding)
                     ["Pruning", "Fertilizer application",
                      "Agro-chemical use", "Harvest"]),
            f_select("allocated_round",
                     ["Round 1", "Round 2", "Round 3",
                      "Round 4", "Round 5"]),
            f_text("item"),
            f_text("brand"),
            f_select("unit", ["Manday", "Kg", "Liter", "Kwh"]),
            f_number("quantity"),
            f_number("unit_price"),
            f_number("total_cost"),
            f_text("remarks"),
            f_relation("recorded_by", USERS_ID) if USERS_ID else f_text("recorded_by"),
        ] + autodate_fields())

    # ── 5. revenue_entries ───────────────────────────────────────────────────
    # Per-sale revenue transactions (coffee + intercrop).
    # Includes fresh-cherry unit conversion for normalised comparison.
    # Frequency: PER SALE TRANSACTION (mùa thu hoạch)
    if collection_exists("revenue_entries"):
        print("  [revenue_entries] SKIPPED – already exists")
    else:
        create_collection("revenue_entries", [
            f_relation("model_id", DEMO_MODELS_ID, required=True,
                       cascade_delete=True) if DEMO_MODELS_ID else f_text("model_id"),
            f_date("sale_date", required=True),    # Ngày bán
            f_int("crop_year"),                    # Năm vụ mùa
            f_text("purchasing_agent"),            # Điểm thu mua / đại lý
            f_select("revenue_source",             # Nguồn doanh thu
                     ["Coffee", "Intercrop"], required=True),
            f_select("coffee_form",                # Hình thức cà phê bán
                     ["Fresh cherry", "Dried cherry", "Green bean"]),
            f_select("intercrop_type",             # Loại cây xen canh
                     ["Durian", "Macadamia", "Avocado", "Other"]),
            f_text("intercrop_name_other"),        # Tên khác
            f_number("quantity_kg", required=True),# Số lượng bán (kg)
            f_number("unit_price"),                # Đơn giá (VNĐ/kg)
            f_number("total_revenue"),             # Doanh thu = qty × price
            # Fresh-cherry equivalents (auto-computed, store for reporting)
            # Dried cherry: ×3 | Green bean: ×5 | Fresh cherry: ×1
            f_number("qty_fresh_cherry_equiv"),    # Quy đổi ra cà phê tươi (kg)
            f_number("price_fresh_cherry_equiv"),  # Giá tương đương cà phê tươi
            f_text("remarks"),
            f_relation("recorded_by", USERS_ID) if USERS_ID else f_text("recorded_by"),
        ] + autodate_fields())

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("=" * 65)
    print("  DONE.")
    print()
    print("  Fresh-cherry conversion rules (apply in app UI / computed field):")
    print("    Fresh cherry  → factor ×1  (no change)")
    print("    Dried cherry  → factor ×3  (qty×3, price÷3)")
    print("    Green bean    → factor ×5  (qty×5, price÷5)")
    print()
    print("  Collection summary:")
    for name in ["farm_background", "initial_investment",
                 "coffee_cost_entries", "intercrop_cost_entries",
                 "revenue_entries"]:
        c = get_collection(name)
        if c:
            n = len(c.get("fields", []))
            print(f"    {name:<30} {n} fields")
    print("=" * 65)


if __name__ == "__main__":
    main()
