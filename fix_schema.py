"""Script to update PocketBase collection schemas with proper fields"""
import urllib.request, json

TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MTc3MTk1MDE1MCwiaWQiOiJqOGNodjQyZnUxcHpsM3kiLCJyZWZyZXNoYWJsZSI6dHJ1ZSwidHlwZSI6ImF1dGgifQ.JrPMFTSVMHPyB_nOl-pKbE5Q7KBhoniLbhrs__EwTXY'
BASE = 'https://tcn.lvtcenter.it.com/api/collections'

def get_collection(name):
    req = urllib.request.Request(f'{BASE}/{name}', headers={'Authorization': f'Bearer {TOKEN}'})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

def patch_collection(name, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f'{BASE}/{name}', data=body, headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json'
    }, method='PATCH')
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

def make_text(name, required=False, max_len=255):
    return {'type':'text','name':name,'required':required,'max':max_len,'min':0,'hidden':False,'presentable':False,'system':False}

def make_number(name, required=False):
    return {'type':'number','name':name,'required':required,'hidden':False,'presentable':False,'system':False,'min':None,'max':None,'onlyInt':False}

def make_bool(name):
    return {'type':'bool','name':name,'required':False,'hidden':False,'presentable':False,'system':False}

def make_date(name, required=False):
    return {'type':'date','name':name,'required':required,'hidden':False,'presentable':False,'system':False,'min':'','max':''}

def make_email(name, required=False):
    return {'type':'email','name':name,'required':required,'hidden':False,'presentable':False,'system':False,'exceptDomains':[],'onlyDomains':[]}

def make_select(name, values, required=False, max_select=1):
    return {'type':'select','name':name,'required':required,'hidden':False,'presentable':False,'system':False,'values':values,'maxSelect':max_select}

def make_file(name, max_select=1, max_size=10485760):
    return {'type':'file','name':name,'required':False,'hidden':False,'presentable':False,'system':False,'maxSelect':max_select,'maxSize':max_size,'mimeTypes':[],'thumbs':[],'protected':False}

def make_relation(name, collection_id, required=False, cascade_delete=False, max_select=1):
    return {'type':'relation','name':name,'required':required,'hidden':False,'presentable':False,'system':False,'collectionId':collection_id,'cascadeDelete':cascade_delete,'maxSelect':max_select,'minSelect':0}

# First get collection IDs
col_ids = {}
for col_name in ['farmers','farm_baselines','coffee_models','annual_activities','training_records','financial_records']:
    data = get_collection(col_name)
    col_ids[col_name] = data['id']
    print(f'{col_name} -> {data["id"]}')

print()

# FARMERS
print('Updating farmers...')
existing = get_collection('farmers')
existing_fields = existing['fields']
new_fields = existing_fields + [
    make_text('farmer_code', required=True),
    make_text('full_name', required=True),
    make_select('gender', ['Nam','Nu','Khac']),
    make_date('date_of_birth'),
    make_text('id_card'),
    make_text('phone', max_len=20),
    make_email('email'),
    make_text('village'),
    make_text('commune'),
    make_text('district'),
    make_text('province'),
    make_number('household_members'),
    make_bool('household_head'),
    make_select('status', ['active','inactive','suspended']),
    make_text('notes', max_len=5000),
    make_file('photo')
]
result = patch_collection('farmers', {'fields': new_fields})
print(f'  -> {len(result["fields"])} fields')

# FARM_BASELINES
print('Updating farm_baselines...')
existing = get_collection('farm_baselines')
existing_fields = existing['fields']
new_fields = existing_fields + [
    make_relation('farmer_id', col_ids['farmers'], required=True, cascade_delete=True),
    make_text('farm_code'),
    make_text('farm_name'),
    make_number('total_area'),
    make_number('coffee_area'),
    make_number('intercrop_area'),
    make_text('intercrop_details'),
    make_number('gps_lat'),
    make_number('gps_long'),
    make_number('elevation'),
    make_text('soil_type'),
    make_number('soil_ph'),
    make_select('slope', ['flat','gentle','moderate','steep']),
    make_text('water_source'),
    make_text('irrigation_system'),
    make_select('grass_cover', ['Low','Medium','High']),
    make_number('shade_trees'),
    make_text('notes', max_len=5000),
    make_file('photo')
]
result = patch_collection('farm_baselines', {'fields': new_fields})
print(f'  -> {len(result["fields"])} fields')

# COFFEE_MODELS
print('Updating coffee_models...')
existing = get_collection('coffee_models')
existing_fields = existing['fields']
new_fields = existing_fields + [
    make_relation('farmer_id', col_ids['farmers'], required=True, cascade_delete=True),
    make_relation('farm_id', col_ids['farm_baselines']),
    make_text('model_code'),
    make_text('name', required=True),
    make_select('coffee_type', ['Arabica','Robusta','Mixed','Other']),
    make_text('variety'),
    make_number('area'),
    make_number('tree_count'),
    make_number('planting_year'),
    make_number('tree_age'),
    make_text('location'),
    make_select('adaptation_status', ['planning','implementing','monitoring','completed','suspended']),
    make_date('last_inspection'),
    make_text('notes', max_len=5000),
    make_file('photo')
]
result = patch_collection('coffee_models', {'fields': new_fields})
print(f'  -> {len(result["fields"])} fields')

# ANNUAL_ACTIVITIES
print('Updating annual_activities...')
existing = get_collection('annual_activities')
existing_fields = existing['fields']
new_fields = existing_fields + [
    make_relation('model_id', col_ids['coffee_models'], required=True, cascade_delete=True),
    make_date('activity_date', required=True),
    make_select('activity_type', ['fertilizer','pesticide','pruning','harvesting','tree_support','weeding','irrigation','soil_management','other'], required=True),
    make_text('description'),
    make_text('material_name'),
    make_number('amount'),
    make_text('unit'),
    make_bool('gcp_compliant'),
    make_number('phi_days'),
    make_text('tree_species'),
    make_number('tree_quantity'),
    make_select('tree_quality', ['excellent','good','fair','poor']),
    make_number('survival_rate'),
    make_number('estimated_value'),
    make_text('reason'),
    make_text('notes', max_len=5000),
    make_file('media', max_select=10, max_size=52428800)
]
result = patch_collection('annual_activities', {'fields': new_fields})
print(f'  -> {len(result["fields"])} fields')

# TRAINING_RECORDS
print('Updating training_records...')
existing = get_collection('training_records')
existing_fields = existing['fields']
new_fields = existing_fields + [
    make_relation('farmer_id', col_ids['farmers'], required=True, cascade_delete=True),
    make_date('training_date', required=True),
    make_text('topic', required=True),
    make_text('trainer'),
    make_text('location'),
    make_number('duration_hours'),
    make_number('participants_count'),
    make_select('application_level', ['none','partial','full']),
    make_text('feedback', max_len=5000),
    make_text('notes', max_len=5000),
    make_file('photo', max_select=10, max_size=52428800)
]
result = patch_collection('training_records', {'fields': new_fields})
print(f'  -> {len(result["fields"])} fields')

# FINANCIAL_RECORDS
print('Updating financial_records...')
existing = get_collection('financial_records')
existing_fields = existing['fields']
new_fields = existing_fields + [
    make_text('user_id'),
    make_date('record_date', required=True),
    make_text('category', required=True),
    make_text('item_name', required=True),
    make_number('amount'),
    make_text('notes', max_len=5000),
    make_text('type')
]
result = patch_collection('financial_records', {'fields': new_fields})
print(f'  -> {len(result["fields"])} fields')

print()
print('ALL COLLECTIONS UPDATED SUCCESSFULLY!')
