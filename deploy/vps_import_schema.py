"""Import PocketBase collections via API"""
import paramiko
import json

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"

PB_EMAIL = "admin@lvtcenter.it.com"
PB_PASS = "Admin12345#"
PB_URL = "http://127.0.0.1:8090"

def ssh_connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)
    return ssh

def run(ssh, cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return exit_code, out, err

ssh = ssh_connect()
print("Connected!\n")

# Step 1: Auth as superuser
print("[1/3] Authenticating as superuser...")
code, out, err = run(ssh, f"""curl -s '{PB_URL}/api/admins/auth-with-password' \
  -H 'Content-Type: application/json' \
  -d '{{"identity":"{PB_EMAIL}","password":"{PB_PASS}"}}'""")

if '"token"' not in out:
    # Try v0.25+ superuser auth endpoint
    code, out, err = run(ssh, f"""curl -s '{PB_URL}/api/collections/_superusers/auth-with-password' \
  -H 'Content-Type: application/json' \
  -d '{{"identity":"{PB_EMAIL}","password":"{PB_PASS}"}}'""")

try:
    auth = json.loads(out)
    token = auth.get("token", "")
    if token:
        print(f"  -> Authenticated! Token: {token[:20]}...")
    else:
        print(f"  -> Auth response: {out[:200]}")
        print("  Trying to extract token...")
        # Some versions put it differently
        token = auth.get("record", {}).get("token", "") or auth.get("token", "")
except:
    print(f"  -> Error parsing response: {out[:200]}")
    token = ""

if not token:
    print("  -> Failed to authenticate. Exiting.")
    ssh.close()
    exit(1)

# Step 2: Get existing collections
print("\n[2/3] Checking existing collections...")
code, out, _ = run(ssh, f"curl -s '{PB_URL}/api/collections' -H 'Authorization: Bearer {token}'")
try:
    existing = json.loads(out)
    if isinstance(existing, dict) and "items" in existing:
        existing_names = [c["name"] for c in existing["items"]]
    elif isinstance(existing, list):
        existing_names = [c["name"] for c in existing]
    else:
        existing_names = []
    print(f"  -> Existing: {existing_names}")
except:
    existing_names = []
    print(f"  -> Could not parse: {out[:200]}")

# Step 3: Create collections
print("\n[3/3] Creating collections...")

collections = [
    {
        "name": "farmers",
        "type": "base",
        "schema": [
            {"name": "farmer_code", "type": "text", "required": True},
            {"name": "full_name", "type": "text", "required": True},
            {"name": "gender", "type": "select", "options": {"values": ["Nam", "Nữ", "Khác"]}},
            {"name": "date_of_birth", "type": "date"},
            {"name": "id_card", "type": "text"},
            {"name": "phone", "type": "text"},
            {"name": "email", "type": "email"},
            {"name": "village", "type": "text"},
            {"name": "commune", "type": "text"},
            {"name": "district", "type": "text"},
            {"name": "province", "type": "text"},
            {"name": "household_members", "type": "number"},
            {"name": "household_head", "type": "bool"},
            {"name": "status", "type": "select", "options": {"values": ["active", "inactive", "suspended"]}},
            {"name": "notes", "type": "text"},
            {"name": "photo", "type": "file", "options": {"maxSelect": 1, "maxSize": 10485760}}
        ],
        "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
        "name": "farm_baselines",
        "type": "base",
        "schema": [
            {"name": "farmer_id", "type": "relation", "required": True, "options": {"collectionId": "", "cascadeDelete": True}},
            {"name": "farm_code", "type": "text"},
            {"name": "farm_name", "type": "text"},
            {"name": "total_area", "type": "number"},
            {"name": "coffee_area", "type": "number"},
            {"name": "intercrop_area", "type": "number"},
            {"name": "intercrop_details", "type": "text"},
            {"name": "gps_lat", "type": "number"},
            {"name": "gps_long", "type": "number"},
            {"name": "elevation", "type": "number"},
            {"name": "soil_type", "type": "text"},
            {"name": "soil_ph", "type": "number"},
            {"name": "slope", "type": "select", "options": {"values": ["flat", "gentle", "moderate", "steep"]}},
            {"name": "water_source", "type": "text"},
            {"name": "irrigation_system", "type": "text"},
            {"name": "grass_cover", "type": "select", "options": {"values": ["Low", "Medium", "High"]}},
            {"name": "shade_trees", "type": "number"},
            {"name": "notes", "type": "text"},
            {"name": "photo", "type": "file", "options": {"maxSelect": 1, "maxSize": 10485760}}
        ],
        "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
        "name": "coffee_models",
        "type": "base",
        "schema": [
            {"name": "farmer_id", "type": "relation", "required": True, "options": {"collectionId": "", "cascadeDelete": True}},
            {"name": "farm_id", "type": "relation", "options": {"collectionId": ""}},
            {"name": "model_code", "type": "text"},
            {"name": "name", "type": "text", "required": True},
            {"name": "coffee_type", "type": "select", "options": {"values": ["Arabica", "Robusta", "Mixed", "Other"]}},
            {"name": "variety", "type": "text"},
            {"name": "area", "type": "number"},
            {"name": "tree_count", "type": "number"},
            {"name": "planting_year", "type": "number"},
            {"name": "tree_age", "type": "number"},
            {"name": "location", "type": "text"},
            {"name": "adaptation_status", "type": "select", "options": {"values": ["planning", "implementing", "monitoring", "completed", "suspended"]}},
            {"name": "last_inspection", "type": "date"},
            {"name": "notes", "type": "text"},
            {"name": "photo", "type": "file", "options": {"maxSelect": 1, "maxSize": 10485760}}
        ],
        "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
        "name": "annual_activities",
        "type": "base",
        "schema": [
            {"name": "model_id", "type": "relation", "required": True, "options": {"collectionId": "", "cascadeDelete": True}},
            {"name": "activity_date", "type": "date", "required": True},
            {"name": "activity_type", "type": "select", "required": True, "options": {"values": ["fertilizer", "pesticide", "pruning", "harvesting", "tree_support", "weeding", "irrigation", "soil_management", "other"]}},
            {"name": "description", "type": "text"},
            {"name": "material_name", "type": "text"},
            {"name": "amount", "type": "number"},
            {"name": "unit", "type": "text"},
            {"name": "gcp_compliant", "type": "bool"},
            {"name": "phi_days", "type": "number"},
            {"name": "tree_species", "type": "text"},
            {"name": "tree_quantity", "type": "number"},
            {"name": "tree_quality", "type": "select", "options": {"values": ["excellent", "good", "fair", "poor"]}},
            {"name": "survival_rate", "type": "number"},
            {"name": "estimated_value", "type": "number"},
            {"name": "reason", "type": "text"},
            {"name": "notes", "type": "text"},
            {"name": "media", "type": "file", "options": {"maxSelect": 10, "maxSize": 52428800}}
        ],
        "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
        "name": "training_records",
        "type": "base",
        "schema": [
            {"name": "farmer_id", "type": "relation", "required": True, "options": {"collectionId": "", "cascadeDelete": True}},
            {"name": "training_date", "type": "date", "required": True},
            {"name": "topic", "type": "text", "required": True},
            {"name": "trainer", "type": "text"},
            {"name": "location", "type": "text"},
            {"name": "duration_hours", "type": "number"},
            {"name": "participants_count", "type": "number"},
            {"name": "application_level", "type": "select", "options": {"values": ["none", "partial", "full"]}},
            {"name": "feedback", "type": "text"},
            {"name": "notes", "type": "text"},
            {"name": "photo", "type": "file", "options": {"maxSelect": 10, "maxSize": 52428800}}
        ],
        "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    },
    {
        "name": "financial_records",
        "type": "base",
        "schema": [
            {"name": "user_id", "type": "text"},
            {"name": "record_date", "type": "date", "required": True},
            {"name": "category", "type": "text", "required": True},
            {"name": "item_name", "type": "text", "required": True},
            {"name": "amount", "type": "number", "required": True},
            {"name": "notes", "type": "text"}
        ],
        "listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""
    }
]

# First: create collections without relations
collection_ids = {}

for coll in collections:
    name = coll["name"]
    if name in existing_names:
        print(f"  [{name}] Already exists, getting ID...")
        code, out, _ = run(ssh, f"curl -s '{PB_URL}/api/collections/{name}' -H 'Authorization: Bearer {token}'")
        try:
            data = json.loads(out)
            collection_ids[name] = data.get("id", "")
            print(f"  [{name}] ID: {collection_ids[name]}")
        except:
            print(f"  [{name}] Could not get ID")
        continue

    # Remove relation fields temporarily (will add later)
    schema_no_rel = []
    for field in coll["schema"]:
        if field["type"] != "relation":
            schema_no_rel.append(field)

    payload = {
        "name": name,
        "type": coll["type"],
        "schema": schema_no_rel,
        "listRule": coll.get("listRule", ""),
        "viewRule": coll.get("viewRule", ""),
        "createRule": coll.get("createRule", ""),
        "updateRule": coll.get("updateRule", ""),
        "deleteRule": coll.get("deleteRule", "")
    }

    payload_json = json.dumps(payload).replace("'", "'\\''")
    code, out, _ = run(ssh, f"curl -s -X POST '{PB_URL}/api/collections' -H 'Authorization: Bearer {token}' -H 'Content-Type: application/json' -d '{payload_json}'")

    try:
        result = json.loads(out)
        cid = result.get("id", "")
        collection_ids[name] = cid
        if cid:
            print(f"  [{name}] Created! ID: {cid}")
        else:
            print(f"  [{name}] Response: {out[:200]}")
    except:
        print(f"  [{name}] Error: {out[:200]}")

print(f"\n  Collection IDs: {collection_ids}")

# Now add relation fields
print("\n  Adding relation fields...")

relation_map = {
    "farm_baselines": [("farmer_id", "farmers", True)],
    "coffee_models": [("farmer_id", "farmers", True), ("farm_id", "farm_baselines", False)],
    "annual_activities": [("model_id", "coffee_models", True)],
    "training_records": [("farmer_id", "farmers", True)],
}

for coll_name, relations in relation_map.items():
    if coll_name not in collection_ids:
        print(f"  [{coll_name}] Skipping - no ID")
        continue

    coll_id = collection_ids[coll_name]

    # Get current schema
    code, out, _ = run(ssh, f"curl -s '{PB_URL}/api/collections/{coll_name}' -H 'Authorization: Bearer {token}'")
    try:
        current = json.loads(out)
        current_schema = current.get("schema", [])
    except:
        current_schema = []

    for rel_field, target_coll, required in relations:
        target_id = collection_ids.get(target_coll, "")
        if not target_id:
            print(f"  [{coll_name}.{rel_field}] Target {target_coll} not found!")
            continue

        # Check if field already exists
        field_exists = any(f.get("name") == rel_field for f in current_schema)
        if field_exists:
            print(f"  [{coll_name}.{rel_field}] Already exists")
            continue

        # Add relation field to schema
        new_field = {
            "name": rel_field,
            "type": "relation",
            "required": required,
            "options": {
                "collectionId": target_id,
                "cascadeDelete": True,
                "maxSelect": 1
            }
        }
        current_schema.append(new_field)

    # Update collection with new schema
    update_payload = json.dumps({"schema": current_schema}).replace("'", "'\\''")
    code, out, _ = run(ssh, f"curl -s -X PATCH '{PB_URL}/api/collections/{coll_id}' -H 'Authorization: Bearer {token}' -H 'Content-Type: application/json' -d '{update_payload}'")

    try:
        result = json.loads(out)
        if result.get("id"):
            print(f"  [{coll_name}] Relations added!")
        else:
            print(f"  [{coll_name}] Update response: {out[:200]}")
    except:
        print(f"  [{coll_name}] Error: {out[:200]}")

# Update users collection to add custom fields
print("\n  Updating users collection...")
code, out, _ = run(ssh, f"curl -s '{PB_URL}/api/collections/users' -H 'Authorization: Bearer {token}'")
try:
    users_coll = json.loads(out)
    users_id = users_coll.get("id", "")
    users_schema = users_coll.get("schema", [])
    existing_fields = [f["name"] for f in users_schema]

    user_fields = [
        {"name": "full_name", "type": "text"},
        {"name": "organization", "type": "select", "options": {"values": ["tcn", "tch", "nkg", "far", "gus"]}},
        {"name": "role", "type": "select", "options": {"values": ["Admin", "Staff", "Viewer", "Farmer", "Guest"]}},
        {"name": "employee_code", "type": "text"},
        {"name": "phone", "type": "text"}
    ]

    for field in user_fields:
        if field["name"] not in existing_fields:
            users_schema.append(field)

    update_payload = json.dumps({"schema": users_schema}).replace("'", "'\\''")
    code, out, _ = run(ssh, f"curl -s -X PATCH '{PB_URL}/api/collections/{users_id}' -H 'Authorization: Bearer {token}' -H 'Content-Type: application/json' -d '{update_payload}'")
    result = json.loads(out)
    if result.get("id"):
        print(f"  [users] Custom fields added!")
    else:
        print(f"  [users] Response: {out[:200]}")
except Exception as e:
    print(f"  [users] Error: {e}")

# Final: list all collections
print("\n" + "=" * 50)
code, out, _ = run(ssh, f"curl -s '{PB_URL}/api/collections' -H 'Authorization: Bearer {token}'")
try:
    data = json.loads(out)
    items = data.get("items", data) if isinstance(data, dict) else data
    print("  Collections:")
    for c in items:
        fields = len(c.get("schema", []))
        print(f"    - {c['name']} ({c['type']}) - {fields} fields")
except:
    print(f"  {out[:300]}")

print("=" * 50)
print("  DONE! All collections imported.")

ssh.close()
