"""
Create land_plots records for all existing farmers using demo_models data.
"""
import sys, requests
sys.stdout.reconfigure(encoding='utf-8')

PB_URL = 'https://tcn.lvtcenter.it.com'
r = requests.post(f'{PB_URL}/api/collections/_superusers/auth-with-password',
    json={'identity': 'admin@lvtcenter.it.com', 'password': 'Admin12345#'}, verify=False, timeout=10)
token = r.json()['token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Get all farmers
r2 = requests.get(f'{PB_URL}/api/collections/farmers/records?perPage=50', headers=headers, verify=False)
farmers = r2.json().get('items', [])
print(f"Farmers: {len(farmers)}")

# Get all demo_models to find farmer + area info
r3 = requests.get(f'{PB_URL}/api/collections/demo_models/records?perPage=50', headers=headers, verify=False)
models = r3.json().get('items', [])
model_by_farmer = {m.get('farmer_id', ''): m for m in models}
print(f"Models: {len(models)}")

# Check existing land_plots
r4 = requests.get(f'{PB_URL}/api/collections/land_plots/records?perPage=50', headers=headers, verify=False)
existing = r4.json().get('items', [])
existing_farmers = {p.get('farmer_id','') for p in existing}
print(f"Existing land_plots: {len(existing)}")

created = 0
skipped = 0

for farmer in farmers:
    fid = farmer.get('id','')
    if not fid:
        continue

    if fid in existing_farmers:
        print(f"  SKIP {farmer.get('farmer_code','?')[:15]} - already has plot")
        skipped += 1
        continue

    # Get model data for this farmer
    model = model_by_farmer.get(fid, {})

    # Build land_plot record
    plot_data = {
        'farmer_id': fid,
        'plot_name': model.get('model_name', farmer.get('full_name', 'Plot')),
        'area_ha': model.get('target_area', 0) or 0,
        'tree_count': model.get('target_trees', 0) or 0,
        'gps_lat': model.get('gps_lat', None),
        'gps_long': model.get('gps_long', None),
        'gps_polygon': model.get('gps_polygon', None),
        'commune': model.get('commune', None),
        'village': model.get('village', None),
        'province': model.get('province', None),
        # Default values for new Layer fields
        'lurc_status': '',
        'ownership_status': '',
        'coffee_variety': model.get('coffee_type', ''),
        'soil_type_plot': '',
        'irrigation_method': '',
        'eudr_status': '',
        'deforestation_risk': '',
    }

    r_create = requests.post(f'{PB_URL}/api/collections/land_plots/records',
        headers=headers, json=plot_data, verify=False)

    if r_create.status_code == 200:
        pid = r_create.json().get('id','')
        print(f"  CREATED {farmer.get('farmer_code','?')[:15]} -> plot_id={pid[:12]}")
        created += 1
    else:
        err = r_create.text[:100]
        print(f"  ERROR {farmer.get('farmer_code','?')[:15]}: {r_create.status_code} {err}")

print(f"\nDone: {created} created, {skipped} skipped")
