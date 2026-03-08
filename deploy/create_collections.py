"""
Create new PocketBase collections for TCN project (Phase 2).
Collections: demo_models, household_members, land_plots, income_records,
             model_inspections, model_diary, model_consumables, sustainability_certs
Also updates 'farmers' with new fields.

PocketBase v0.25 - uses 'fields' array (not 'schema').
"""
import sys
import json
import requests

# Force UTF-8 output for Vietnamese text
sys.stdout.reconfigure(encoding="utf-8")

# ── Config ──────────────────────────────────────────────────────────────────
PB_URL = "https://tcn.lvtcenter.it.com"
PB_EMAIL = "admin@lvtcenter.it.com"
PB_PASS = "Admin12345#"

API = f"{PB_URL}/api"
session = requests.Session()


# ── Field builders (PB v0.25 format) ───────────────────────────────────────

def f_text(name, required=False, max_len=0):
    f = {"type": "text", "name": name, "required": required,
         "system": False, "hidden": False, "presentable": False}
    if max_len:
        f["max"] = max_len
    return f

def f_number(name, required=False):
    return {"type": "number", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False,
            "min": None, "max": None, "onlyInt": False}

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

def f_file(name, max_select=1, max_size=10485760):
    return {"type": "file", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "maxSelect": max_select, "maxSize": max_size,
            "mimeTypes": [], "thumbs": [], "protected": False}

def f_relation(name, collection_id, required=False, cascade_delete=False, max_select=1):
    return {"type": "relation", "name": name, "required": required,
            "system": False, "hidden": False, "presentable": False,
            "collectionId": collection_id, "cascadeDelete": cascade_delete,
            "maxSelect": max_select, "minSelect": 0}

def f_json(name):
    return {"type": "json", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "maxSize": 2000000}

def f_autodate(name, on_create=True, on_update=False):
    return {"type": "autodate", "name": name, "required": False,
            "system": False, "hidden": False, "presentable": False,
            "onCreate": on_create, "onUpdate": on_update}

# Standard created/updated fields every collection needs
def autodate_fields():
    return [
        f_autodate("created", on_create=True, on_update=False),
        f_autodate("updated", on_create=True, on_update=True),
    ]


# ── Auth ────────────────────────────────────────────────────────────────────

def authenticate():
    """Authenticate as superuser (PB v0.25 endpoint)."""
    print("=" * 60)
    print("  PocketBase Collection Creator - TCN Phase 2")
    print("=" * 60)
    print()
    print("[AUTH] Authenticating as superuser...")

    # PB v0.25+ superuser auth
    url = f"{API}/collections/_superusers/auth-with-password"
    r = session.post(url, json={"identity": PB_EMAIL, "password": PB_PASS})

    if r.status_code != 200:
        # Fallback to legacy endpoint
        url2 = f"{API}/admins/auth-with-password"
        r = session.post(url2, json={"identity": PB_EMAIL, "password": PB_PASS})

    if r.status_code != 200:
        print(f"  FAILED to authenticate (HTTP {r.status_code})")
        print(f"  Response: {r.text[:300]}")
        sys.exit(1)

    data = r.json()
    token = data.get("token", "")
    if not token:
        print(f"  No token in response: {r.text[:300]}")
        sys.exit(1)

    session.headers.update({"Authorization": f"Bearer {token}"})
    print(f"  OK - Token: {token[:30]}...")
    return token


# ── Helpers ─────────────────────────────────────────────────────────────────

def get_collection(name):
    """Fetch a collection by name. Returns dict or None."""
    r = session.get(f"{API}/collections/{name}")
    if r.status_code == 200:
        return r.json()
    return None

def get_collection_id(name):
    """Get the internal PB ID for a collection."""
    coll = get_collection(name)
    if coll:
        return coll["id"]
    return None

def collection_exists(name):
    """Check if a collection already exists."""
    return get_collection(name) is not None

def create_collection(name, fields, coll_type="base"):
    """Create a new base collection with public rules."""
    payload = {
        "name": name,
        "type": coll_type,
        "fields": fields,
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": "",
    }
    r = session.post(f"{API}/collections", json=payload)
    return r

def patch_collection(name, data):
    """PATCH an existing collection."""
    r = session.patch(f"{API}/collections/{name}", json=data)
    return r


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    authenticate()
    print()

    # ── Step 1: Resolve collection IDs for relations ────────────────────
    print("[STEP 1] Resolving existing collection IDs for relations...")
    ref_collections = {"farmers": None, "farm_baselines": None, "users": None}

    for cname in ref_collections:
        cid = get_collection_id(cname)
        if cid:
            ref_collections[cname] = cid
            print(f"  {cname} -> {cid}")
        else:
            print(f"  WARNING: '{cname}' not found! Relations to it will fail.")

    FARMERS_ID = ref_collections["farmers"]
    FARMS_ID = ref_collections["farm_baselines"]
    USERS_ID = ref_collections["users"]
    print()

    # ── Step 2: Define all new collections ──────────────────────────────
    print("[STEP 2] Creating new collections...")
    print("-" * 60)

    collections_to_create = []

    # 1) demo_models
    collections_to_create.append(("demo_models", [
        f_text("model_code", required=True),
        f_text("model_name", required=True),
        f_text("description"),
        f_text("commune"),
        f_text("village"),
        f_text("district"),
        f_text("province"),
        f_number("target_area"),
        f_number("target_trees"),
        f_text("coffee_type"),
        f_date("start_date"),
        f_select("status", ["planning", "active", "completed"]),
        f_select("data_status", ["full", "partial", "pending"]),
        f_relation("farmer_id", FARMERS_ID, max_select=1) if FARMERS_ID else f_text("farmer_id"),
        f_relation("farm_id", FARMS_ID, max_select=1) if FARMS_ID else f_text("farm_id"),
        f_json("gps_polygon"),
        f_file("photo", max_select=1),
        f_text("notes"),
    ] + autodate_fields()))

    # 2) household_members
    collections_to_create.append(("household_members", [
        f_relation("farmer_id", FARMERS_ID, required=True, cascade_delete=True) if FARMERS_ID else f_text("farmer_id"),
        f_text("member_name", required=True),
        f_select("gender", ["Nam", "Nữ"]),
        f_number("birth_year"),
        f_text("relation_to_head"),
        f_text("education"),
        f_bool("coffee_participation"),
        f_text("production_stages"),
    ] + autodate_fields()))

    # 3) land_plots
    collections_to_create.append(("land_plots", [
        f_relation("farmer_id", FARMERS_ID, required=True, cascade_delete=True) if FARMERS_ID else f_text("farmer_id"),
        f_text("plot_name"),
        f_number("area_ha", required=True),
        f_number("forest_area"),
        f_number("tree_count"),
        f_bool("intercrop"),
        f_text("intercrop_species"),
        f_number("harvest_area"),
        f_number("yield_current"),
        f_text("ownership_type"),
        f_number("start_year"),
        f_number("latest_planting"),
        f_text("previous_crop"),
        f_number("forest_distance_km"),
        f_bool("gps_mapped"),
    ] + autodate_fields()))

    # 4) income_records
    collections_to_create.append(("income_records", [
        f_relation("farmer_id", FARMERS_ID, required=True, cascade_delete=True) if FARMERS_ID else f_text("farmer_id"),
        f_number("year", required=True),
        f_number("total_income"),
        f_number("agri_income_ratio"),
        f_number("coffee_revenue"),
        f_number("coffee_cost"),
        f_number("coffee_net"),
        f_number("rice_income"),
        f_number("fruit_income"),
        f_number("livestock_income"),
        f_number("salary_income"),
        f_number("business_income"),
        f_number("other_income"),
        f_number("production_tons"),
        f_number("production_value"),
    ] + autodate_fields()))

    # We need demo_models ID for inspection/diary/consumables.
    # We'll create demo_models first, then get its ID.
    # But since we create collections in order, demo_models is first.

    # Placeholder - will be filled after demo_models is created
    DEMO_MODELS_ID = None

    # 5-7 need demo_models ID, we'll create them after demo_models exists
    deferred_collections = []

    # 5) model_inspections
    deferred_collections.append(("model_inspections", lambda dm_id: [
        f_relation("model_id", dm_id, required=True, cascade_delete=True),
        f_relation("inspector_id", USERS_ID, max_select=1) if USERS_ID else f_text("inspector_id"),
        f_date("inspection_date", required=True),
        f_select("inspection_type", ["quarterly", "monthly", "adhoc"], required=True),
        f_text("quarter"),
        f_select("growth_quality", ["poor", "fair", "good", "excellent"]),
        f_select("pest_status", ["none", "minor", "moderate", "severe"]),
        f_text("pest_details"),
        f_select("soil_condition", ["poor", "fair", "good", "excellent"]),
        f_select("water_status", ["drought", "adequate", "excess"]),
        f_number("tree_health_pct"),
        f_select("fruit_quality", ["poor", "fair", "good", "excellent"]),
        f_text("recommendations"),
        f_text("follow_up_actions"),
        f_file("photos", max_select=5),
        f_text("notes"),
    ] + autodate_fields()))

    # 6) model_diary
    deferred_collections.append(("model_diary", lambda dm_id: [
        f_relation("model_id", dm_id, required=True, cascade_delete=True),
        f_relation("author_id", USERS_ID, max_select=1) if USERS_ID else f_text("author_id"),
        f_date("diary_date", required=True),
        f_select("activity_type", ["fertilize", "pesticide", "irrigate", "prune", "weed", "harvest", "tree_care", "other"], required=True),
        f_text("description", required=True),
        f_text("material_name"),
        f_number("material_amount"),
        f_text("material_unit"),
        f_number("labor_hours"),
        f_number("labor_cost"),
        f_number("material_cost"),
        f_bool("gcp_compliant"),
        f_text("weather"),
        f_file("photos", max_select=5),
        f_text("notes"),
    ] + autodate_fields()))

    # 7) model_consumables
    deferred_collections.append(("model_consumables", lambda dm_id: [
        f_relation("model_id", dm_id, required=True, cascade_delete=True),
        f_date("record_date", required=True),
        f_select("category", ["electricity", "water", "fertilizer", "pesticide", "labor", "fuel", "other"], required=True),
        f_text("item_name", required=True),
        f_number("quantity"),
        f_text("unit"),
        f_number("unit_price"),
        f_number("total_cost"),
        f_text("notes"),
    ] + autodate_fields()))

    # 8) sustainability_certs
    collections_to_create.append(("sustainability_certs", [
        f_relation("farmer_id", FARMERS_ID, required=True, cascade_delete=True) if FARMERS_ID else f_text("farmer_id"),
        f_text("cert_type", required=True),
        f_bool("family_knows"),
        f_text("who_knows_most"),
        f_bool("is_beneficial"),
        f_bool("practiced_on_land"),
        f_bool("is_certified"),
        f_text("who_practices"),
    ] + autodate_fields()))

    # ── Create non-deferred collections ─────────────────────────────────
    created_count = 0
    skipped_count = 0
    error_count = 0

    for coll_name, fields in collections_to_create:
        if collection_exists(coll_name):
            print(f"  [{coll_name}] SKIPPED - already exists")
            skipped_count += 1
            # If it's demo_models, get its ID for deferred collections
            if coll_name == "demo_models":
                DEMO_MODELS_ID = get_collection_id(coll_name)
                print(f"    -> demo_models ID: {DEMO_MODELS_ID}")
            continue

        r = create_collection(coll_name, fields)
        if r.status_code == 200:
            data = r.json()
            cid = data.get("id", "?")
            n_fields = len(data.get("fields", []))
            print(f"  [{coll_name}] CREATED - id: {cid}, {n_fields} fields")
            created_count += 1
            if coll_name == "demo_models":
                DEMO_MODELS_ID = cid
                print(f"    -> demo_models ID: {DEMO_MODELS_ID}")
        else:
            error_count += 1
            try:
                err = r.json()
                print(f"  [{coll_name}] ERROR ({r.status_code}): {json.dumps(err, ensure_ascii=False)[:300]}")
            except Exception:
                print(f"  [{coll_name}] ERROR ({r.status_code}): {r.text[:300]}")

    # ── Create deferred collections (need demo_models ID) ───────────────
    if not DEMO_MODELS_ID:
        # Last chance: try to get it
        DEMO_MODELS_ID = get_collection_id("demo_models")

    if DEMO_MODELS_ID:
        for coll_name, fields_fn in deferred_collections:
            if collection_exists(coll_name):
                print(f"  [{coll_name}] SKIPPED - already exists")
                skipped_count += 1
                continue

            fields = fields_fn(DEMO_MODELS_ID)
            r = create_collection(coll_name, fields)
            if r.status_code == 200:
                data = r.json()
                cid = data.get("id", "?")
                n_fields = len(data.get("fields", []))
                print(f"  [{coll_name}] CREATED - id: {cid}, {n_fields} fields")
                created_count += 1
            else:
                error_count += 1
                try:
                    err = r.json()
                    print(f"  [{coll_name}] ERROR ({r.status_code}): {json.dumps(err, ensure_ascii=False)[:300]}")
                except Exception:
                    print(f"  [{coll_name}] ERROR ({r.status_code}): {r.text[:300]}")
    else:
        print(f"\n  WARNING: demo_models collection ID not available!")
        print(f"  Skipping model_inspections, model_diary, model_consumables")
        for coll_name, _ in deferred_collections:
            print(f"  [{coll_name}] SKIPPED - no demo_models ID")
            skipped_count += 1

    print("-" * 60)
    print()

    # ── Step 3: Update farmers with new fields ──────────────────────────
    print("[STEP 3] Updating 'farmers' collection with new fields...")

    farmers_coll = get_collection("farmers")
    if not farmers_coll:
        print("  ERROR: 'farmers' collection not found!")
        error_count += 1
    else:
        existing_fields = farmers_coll.get("fields", [])
        existing_names = {f["name"] for f in existing_fields}

        new_farmer_fields = [
            f_text("ethnicity"),
            f_select("economic_class", ["Nghèo", "Cận nghèo", "Bình thường", "Khá"]),
            f_bool("cooperative_member"),
            f_number("coffee_years"),
            f_text("education"),
            f_number("total_farms"),
        ]

        fields_to_add = [f for f in new_farmer_fields if f["name"] not in existing_names]

        if not fields_to_add:
            print("  All new fields already exist - nothing to add")
        else:
            merged_fields = existing_fields + fields_to_add
            r = patch_collection("farmers", {"fields": merged_fields})
            if r.status_code == 200:
                data = r.json()
                n_fields = len(data.get("fields", []))
                added_names = [f["name"] for f in fields_to_add]
                print(f"  OK - Added {len(fields_to_add)} fields: {', '.join(added_names)}")
                print(f"  Total fields now: {n_fields}")
            else:
                error_count += 1
                try:
                    err = r.json()
                    print(f"  ERROR ({r.status_code}): {json.dumps(err, ensure_ascii=False)[:300]}")
                except Exception:
                    print(f"  ERROR ({r.status_code}): {r.text[:300]}")

    # ── Summary ─────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print(f"  DONE!  Created: {created_count}  Skipped: {skipped_count}  Errors: {error_count}")
    print("=" * 60)

    # List all collections for verification
    print()
    print("[VERIFY] Current collections:")
    r = session.get(f"{API}/collections", params={"perPage": 100})
    if r.status_code == 200:
        data = r.json()
        items = data.get("items", []) if isinstance(data, dict) else data
        for c in items:
            ctype = c.get("type", "?")
            n = len(c.get("fields", c.get("schema", [])))
            print(f"  - {c['name']} ({ctype}) - {n} fields")
    else:
        print(f"  Could not list collections: {r.status_code}")


if __name__ == "__main__":
    main()
