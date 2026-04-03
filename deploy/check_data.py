import sys
sys.stdout.reconfigure(encoding='utf-8')
import requests

PB_URL = 'https://tcn.lvtcenter.it.com'
r = requests.post(f'{PB_URL}/api/collections/_superusers/auth-with-password',
    json={'identity': 'admin@lvtcenter.it.com', 'password': 'Admin12345#'}, verify=False, timeout=10)
token = r.json()['token']
headers = {'Authorization': f'Bearer {token}'}

# Get demo_models
r2 = requests.get(f'{PB_URL}/api/collections/demo_models/records?perPage=10', headers=headers, verify=False)
models = r2.json().get('items', [])

# Get farmers
r3 = requests.get(f'{PB_URL}/api/collections/farmers/records?perPage=10', headers=headers, verify=False)
farmers = r3.json().get('items', [])
farmer_by_id = {f['id']: f for f in farmers}

# Get land_plots
r4 = requests.get(f'{PB_URL}/api/collections/land_plots/records?perPage=50', headers=headers, verify=False)
plots = r4.json().get('items', [])
total_plots = r4.json().get('totalItems', 0)

print(f'Models: {len(models)} | Farmers: {len(farmers)} | Land plots: {total_plots}')

# Check if land_plots link to farmers
plot_by_farmer = {}
for p in plots:
    fid = p.get('farmer_id','')
    if fid not in plot_by_farmer:
        plot_by_farmer[fid] = []
    plot_by_farmer[fid].append(p)

for m in models:
    fid = m.get('farmer_id','')
    plots_for_f = plot_by_farmer.get(fid, [])
    print(f'  Model {m["model_code"]}: farmer={fid[:8]} plots={len(plots_for_f)}')

# Show plot fields
if plots:
    print('\nFirst plot fields:', list(plots[0].keys())[:20])
else:
    print('\nNo land_plots records!')

# Show what demo_models has
print('\ndemo_models fields:', [k for k in models[0].keys() if k not in ['id','created','updated']])
