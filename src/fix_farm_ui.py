"""
Patch ModelDetailView.jsx:
1. loadAllData: read farm from land_plots[0] instead of farm_baselines
2. handleSaveFarm: save to land_plots instead of farm_baselines
3. openEditFarm: map land_plots fields correctly
4. renderFarm: show plots data with fallback for farm_name -> plot_name
"""
import re

content = open('c:/Users/User/OneDrive/Webapp/Tancaonguyen/src/ModelDetailView.jsx', 'r', encoding='utf-8').read()

# ── 1. Fix loadAllData: use first land_plots record as 'farm' ──
OLD_LOAD = """            if (model.farm_id) {
                const fm = await pb.collection('farm_baselines').getOne(model.farm_id).catch(() => null);
                setFarm(fm);
            }"""
NEW_LOAD = """            // Read farm from land_plots (primary) or farm_baselines (fallback)
            let farmData = null;
            if (model.farm_id) {
                farmData = await pb.collection('farm_baselines').getOne(model.farm_id).catch(() => null);
            }
            if (!farmData && farmer) {
                const plots = await pb.collection('land_plots').getFullList({ filter: `farmer_id='${farmer.id}'` }).catch(() => []);
                farmData = plots[0] || null;
            }
            setFarm(farmData);"""
if OLD_LOAD in content:
    content = content.replace(OLD_LOAD, NEW_LOAD)
    print("1. Fixed loadAllData to read from land_plots")
else:
    print("1. SKIP - loadAllData pattern not found")

# ── 2. Fix handleSaveFarm: save to land_plots instead of farm_baselines ──
OLD_SAVE_FARM = """            await pb.collection('farm_baselines').update(farm.id, data);
            const updated = await pb.collection('farm_baselines').getOne(farm.id);
            setFarm(updated);
            setShowFarmForm(false);"""
NEW_SAVE_FARM = """            if (farm?.expand?.farmer_id || farm?.farmer_id) {
                // Save to land_plots
                const fid = farm.expand?.farmer_id || farm.farmer_id;
                const plots = await pb.collection('land_plots').getFullList({ filter: `farmer_id='${fid}'` }).catch(() => []);
                if (plots.length > 0) {
                    await pb.collection('land_plots').update(plots[0].id, data);
                    const updated = await pb.collection('land_plots').getOne(plots[0].id);
                    setFarm(updated);
                } else {
                    const created = await pb.collection('land_plots').create({ farmer_id: fid, ...data });
                    setFarm(created);
                }
            } else {
                // Save to farm_baselines
                await pb.collection('farm_baselines').update(farm.id, data);
                const updated = await pb.collection('farm_baselines').getOne(farm.id);
                setFarm(updated);
            }
            setShowFarmForm(false);"""
if OLD_SAVE_FARM in content:
    content = content.replace(OLD_SAVE_FARM, NEW_SAVE_FARM)
    print("2. Fixed handleSaveFarm to save to land_plots")
else:
    print("2. SKIP - handleSaveFarm pattern not found")

# ── 3. Fix renderFarm display: use plot_name as farm_name fallback ──
# Replace InfoRow that shows farm.farm_name with farm.plot_name fallback
OLD_FARM_NAME = """                    <InfoRow label={appLang === 'vi' ? 'Tên trang trại' : 'Farm Name'} value={farm.farm_name} icon="fa-tag" />"""
NEW_FARM_NAME = """                    <InfoRow label={appLang === 'vi' ? 'Tên mảnh đất' : 'Plot Name'} value={farm.plot_name || farm.farm_name} icon="fa-tag" />"""
if OLD_FARM_NAME in content:
    content = content.replace(OLD_FARM_NAME, NEW_FARM_NAME)
    print("3. Fixed renderFarm farm_name display")
else:
    print("3. SKIP - farm_name display already fixed or pattern different")

# ── 4. Fix openEditFarm: map plot_name -> farm_name for form ──
OLD_OPEN_FARM = """            farm_name: farm?.farm_name || '',
            total_area: farm?.total_area || '',
            coffee_area: farm?.coffee_area || '',
            intercrop_area: farm?.intercrop_area || '',
            intercrop_details: farm?.intercrop_details || '',
            soil_type: farm?.soil_type || '',
            soil_ph: farm?.soil_ph || '',
            slope: farm?.slope || '',
            water_source: farm?.water_source || '',
            irrigation_system: farm?.irrigation_system || '',
            elevation: farm?.elevation || '',
            gps_lat: farm?.gps_lat || '',
            gps_long: farm?.gps_long || '',
            grass_cover: farm?.grass_cover || '',
            shade_trees: farm?.shade_trees || '',
            notes: farm?.notes || '',"""
NEW_OPEN_FARM = """            farm_name: farm?.plot_name || farm?.farm_name || '',
            total_area: farm?.area_ha || farm?.total_area || '',
            coffee_area: farm?.coffee_area || '',
            intercrop_area: farm?.intercrop_area || '',
            intercrop_details: farm?.intercrop_species || farm?.intercrop_details || '',
            soil_type: farm?.soil_type || '',
            soil_ph: farm?.soil_ph_plot || farm?.soil_ph || '',
            slope: farm?.slope || '',
            water_source: farm?.water_source || '',
            irrigation_system: farm?.irrigation_system || '',
            elevation: farm?.elevation || '',
            gps_lat: farm?.gps_lat || '',
            gps_long: farm?.gps_long || '',
            grass_cover: farm?.grass_cover || '',
            shade_trees: farm?.shade_trees || '',
            notes: farm?.notes || '',"""
if OLD_OPEN_FARM in content:
    content = content.replace(OLD_OPEN_FARM, NEW_OPEN_FARM)
    print("4. Fixed openEditFarm field mapping")
else:
    print("4. SKIP - openEditFarm already has correct fields")

# ── 5. Fix save payload: map farm_name -> plot_name for land_plots ──
# Insert plot_name mapping at start of handleSaveFarm data object
OLD_SAVE_DATA = """            const data = {
                farm_name: farmForm.farm_name || null,"""
NEW_SAVE_DATA = """            const data = {
                plot_name: farmForm.farm_name || null,
                area_ha: farmForm.total_area ? Number(farmForm.total_area) : null,"""
if OLD_SAVE_DATA in content:
    content = content.replace(OLD_SAVE_DATA, NEW_SAVE_DATA)
    print("5. Fixed save payload with plot_name/area_ha mapping")
else:
    print("5. SKIP - save data already mapped")

with open('c:/Users/User/OneDrive/Webapp/Tancaonguyen/src/ModelDetailView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nAll patches applied!")
