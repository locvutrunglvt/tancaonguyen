import React, { useState, useEffect, useCallback } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import ModelReport from './ModelReport';
import ModelEconomics from './ModelEconomics';
import { getDisplayCurrency, getCachedRates, formatCompact } from './currencyUtils';
import { formatDate } from './dateUtils';
import MediaUpload from './MediaUpload';
import './Dashboard.css';

const TABS = [
    { id: 'overview', icon: 'fa-info-circle', vi: 'Tổng quan', en: 'Overview', ede: 'Klei dlieh' },
    { id: 'farmer', icon: 'fa-user', vi: 'Nông hộ', en: 'Farmer', ede: 'Mnuih' },
    { id: 'farm', icon: 'fa-map', vi: 'Trang trại', en: 'Farm', ede: 'Hma' },
    { id: 'diary', icon: 'fa-book', vi: 'Nhật ký', en: 'Diary', ede: 'Hdro' },
    { id: 'inspect', icon: 'fa-clipboard-check', vi: 'Kiểm tra', en: 'Inspect', ede: 'Dlang' },
    { id: 'consumable', icon: 'fa-receipt', vi: 'Tiêu hao', en: 'Costs', ede: 'Prak' },
    { id: 'invest', icon: 'fa-chart-pie', vi: 'Đầu tư', en: 'Invest', ede: 'Mnga' },
    { id: 'economics', icon: 'fa-coins', vi: 'Kinh tế', en: 'Economics', ede: 'Prăk' }
];

const ACTIVITY_TYPES = [
    { value: 'fertilize', vi: 'Bón phân', en: 'Fertilize' },
    { value: 'pesticide', vi: 'Phun thuốc', en: 'Pesticide' },
    { value: 'irrigate', vi: 'Tưới nước', en: 'Irrigate' },
    { value: 'prune', vi: 'Tỉa cành', en: 'Prune' },
    { value: 'weed', vi: 'Làm cỏ', en: 'Weed' },
    { value: 'harvest', vi: 'Thu hoạch', en: 'Harvest' },
    { value: 'transport', vi: 'Vận chuyển', en: 'Transport' },
    { value: 'drying', vi: 'Phơi cà phê', en: 'Drying' },
    { value: 'milling', vi: 'Xay cà phê', en: 'Milling' },
    { value: 'tree_care', vi: 'Chăm cây', en: 'Tree Care' },
    { value: 'other', vi: 'Khác', en: 'Other' },
];

const INSPECTION_TYPES = [
    { value: 'quarterly', vi: 'Hàng quý', en: 'Quarterly' },
    { value: 'monthly', vi: 'Hàng tháng', en: 'Monthly' },
    { value: 'adhoc', vi: 'Đột xuất', en: 'Ad-hoc' },
];

const QUALITY_OPTIONS = [
    { value: 'poor', vi: 'Kém', en: 'Poor' },
    { value: 'fair', vi: 'TB', en: 'Fair' },
    { value: 'good', vi: 'Tốt', en: 'Good' },
    { value: 'excellent', vi: 'Rất tốt', en: 'Excellent' },
];

const WATER_OPTIONS = [
    { value: 'drought', vi: 'Hạn', en: 'Drought' },
    { value: 'adequate', vi: 'Đủ', en: 'Adequate' },
    { value: 'excess', vi: 'Thừa', en: 'Excess' },
];

const PEST_OPTIONS = [
    { value: 'none', vi: 'Không', en: 'None' },
    { value: 'minor', vi: 'Nhẹ', en: 'Minor' },
    { value: 'moderate', vi: 'TB', en: 'Moderate' },
    { value: 'severe', vi: 'Nặng', en: 'Severe' },
];

const CONSUMABLE_CATEGORIES = [
    { value: 'fertilizer', vi: 'Phân bón', en: 'Fertilizer' },
    { value: 'pesticide', vi: 'Thuốc BVTV', en: 'Pesticide' },
    { value: 'labor', vi: 'Nhân công', en: 'Labor' },
    { value: 'fuel', vi: 'Nhiên liệu', en: 'Fuel' },
    { value: 'electricity', vi: 'Điện', en: 'Electricity' },
    { value: 'water_irrigation', vi: 'Tưới nước', en: 'Irrigation' },
    { value: 'harvest_equip', vi: 'Dụng cụ thu hoạch', en: 'Harvest Equipment' },
    { value: 'transport', vi: 'Vận chuyển', en: 'Transport' },
    { value: 'drying', vi: 'Phơi cà phê', en: 'Drying' },
    { value: 'milling', vi: 'Xay cà phê', en: 'Milling' },
    { value: 'ppe', vi: 'Bảo hộ lao động', en: 'PPE/Safety' },
    { value: 'depreciation', vi: 'Khấu hao', en: 'Depreciation' },
    { value: 'loan_interest', vi: 'Lãi vay', en: 'Loan Interest' },
    { value: 'other', vi: 'Khác', en: 'Other' },
];

const today = () => new Date().toISOString().split('T')[0];

// ── Reusable form field components ──
const FormField = ({ label, children, required }) => (
    <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        {children}
    </div>
);

const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '14px', background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
};

const selectStyle = { ...inputStyle, appearance: 'auto' };

const ModelDetailView = ({ model, onBack, appLang = 'vi', currentUser, canEdit = true }) => {
    const t = translations[appLang] || translations.vi;
    const [activeTab, setActiveTab] = useState('overview');
    const [farmer, setFarmer] = useState(null);
    const [farm, setFarm] = useState(null);
    const [members, setMembers] = useState([]);
    const [plots, setPlots] = useState([]);
    const [income, setIncome] = useState(null);
    const [diary, setDiary] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [consumables, setConsumables] = useState([]);
    const [loading, setLoading] = useState(true);

    // CRUD modal states
    const [showDiaryForm, setShowDiaryForm] = useState(false);
    const [showInspectForm, setShowInspectForm] = useState(false);
    const [showConsumForm, setShowConsumForm] = useState(false);
    const [showFarmerForm, setShowFarmerForm] = useState(false);
    const [showFarmForm, setShowFarmForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [orgUsers, setOrgUsers] = useState([]);
    const [inspectorManual, setInspectorManual] = useState(false);

    // Form data
    const emptyDiary = { diary_date: today(), activity_type: 'fertilize', description: '', material_name: '', material_amount: '', material_unit: 'kg', labor_hours: '', labor_cost: '', material_cost: '', gcp_compliant: false, weather: '', notes: '' };
    const emptyInspect = { inspection_date: today(), inspection_type: 'quarterly', growth_quality: '', pest_status: '', pest_details: '', soil_condition: '', water_status: '', tree_health_pct: '', fruit_quality: '', recommendations: '', follow_up_actions: '', notes: '', soil_ph_sample: '', irrigation_adequacy: '', eudr_check_passed: false, female_participation_pct: '' };
    const emptyConsum = { record_date: today(), category: 'fertilizer', item_name: '', quantity: '', unit: 'kg', unit_price: '', total_cost: '', notes: '' };

    const [diaryForm, setDiaryForm] = useState(emptyDiary);
    const [inspectForm, setInspectForm] = useState(emptyInspect);
    const [consumForm, setConsumForm] = useState(emptyConsum);
    const [farmerForm, setFarmerForm] = useState({});
    const [farmForm, setFarmForm] = useState({});

    useEffect(() => {
        if (model) loadAllData();
    }, [model]);

    useEffect(() => {
        const org = currentUser?.organization || pb.authStore.model?.organization;
        if (org) {
            pb.collection('users').getFullList({ filter: `organization='${org}'`, sort: 'full_name' })
                .then(u => setOrgUsers(u))
                .catch(() => setOrgUsers([]));
        }
    }, [currentUser]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            if (model.farmer_id) {
                const f = await pb.collection('farmers').getOne(model.farmer_id).catch(() => null);
                setFarmer(f);
                if (f) {
                    const [m, p, i] = await Promise.all([
                        pb.collection('household_members').getFullList({ filter: `farmer_id='${f.id}'` }).catch(() => []),
                        pb.collection('land_plots').getFullList({ filter: `farmer_id='${f.id}'` }).catch(() => []),
                        pb.collection('income_records').getFullList({ filter: `farmer_id='${f.id}'`, sort: '-year' }).catch(() => [])
                    ]);
                    setMembers(m);
                    setPlots(p);
                    setIncome(i[0] || null);
                }
            }
            // Read farm from land_plots (primary) or farm_baselines (fallback)
            let farmData = null;
            if (model.farm_id) {
                farmData = await pb.collection('farm_baselines').getOne(model.farm_id).catch(() => null);
            }
            if (!farmData && model.farmer_id) {
                const plots = await pb.collection('land_plots').getFullList({ filter: `farmer_id='${model.farmer_id}'` }).catch(() => []);
                farmData = plots[0] || null;
            }
            setFarm(farmData);
            const [d, ins, con] = await Promise.all([
                pb.collection('model_diary').getFullList({ filter: `model_id='${model.id}'`, sort: '-diary_date' }).catch(() => []),
                pb.collection('model_inspections').getFullList({ filter: `model_id='${model.id}'`, sort: '-inspection_date' }).catch(() => []),
                pb.collection('model_consumables').getFullList({ filter: `model_id='${model.id}'`, sort: '-record_date' }).catch(() => [])
            ]);
            setDiary(d);
            setInspections(ins);
            setConsumables(con);
        } catch (err) {
            console.error('ModelDetail load error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── CRUD Handlers ──

    const handleSaveDiary = async () => {
        if (!diaryForm.description.trim()) return alert(appLang === 'vi' ? 'Vui lòng nhập mô tả' : 'Please enter description');
        setSaving(true);
        try {
            const data = {
                model_id: model.id,
                diary_date: diaryForm.diary_date,
                activity_type: diaryForm.activity_type,
                description: diaryForm.description,
                material_name: diaryForm.material_name || null,
                material_amount: diaryForm.material_amount ? Number(diaryForm.material_amount) : null,
                material_unit: diaryForm.material_unit || null,
                labor_hours: diaryForm.labor_hours ? Number(diaryForm.labor_hours) : null,
                labor_cost: diaryForm.labor_cost ? Number(diaryForm.labor_cost) : null,
                material_cost: diaryForm.material_cost ? Number(diaryForm.material_cost) : null,
                gcp_compliant: diaryForm.gcp_compliant,
                weather: diaryForm.weather || null,
                notes: diaryForm.notes || null,
                author_id: currentUser?.id || null,
            };
            if (editingItem) {
                await pb.collection('model_diary').update(editingItem.id, data);
            } else {
                await pb.collection('model_diary').create(data);
            }
            setShowDiaryForm(false);
            setEditingItem(null);
            setDiaryForm(emptyDiary);
            const d = await pb.collection('model_diary').getFullList({ filter: `model_id='${model.id}'`, sort: '-diary_date' }).catch(() => []);
            setDiary(d);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveInspect = async () => {
        setSaving(true);
        try {
            const data = {
                model_id: model.id,
                inspection_date: inspectForm.inspection_date,
                inspection_type: inspectForm.inspection_type,
                growth_quality: inspectForm.growth_quality || null,
                pest_status: inspectForm.pest_status || null,
                pest_details: inspectForm.pest_details || null,
                soil_condition: inspectForm.soil_condition || null,
                water_status: inspectForm.water_status || null,
                tree_health_pct: inspectForm.tree_health_pct ? Number(inspectForm.tree_health_pct) : null,
                fruit_quality: inspectForm.fruit_quality || null,
                recommendations: inspectForm.recommendations || null,
                follow_up_actions: inspectForm.follow_up_actions || null,
                notes: inspectForm.notes || null,
                inspector_id: currentUser?.id || null,
                soil_ph_sample: inspectForm.soil_ph_sample ? Number(inspectForm.soil_ph_sample) : null,
                irrigation_adequacy: inspectForm.irrigation_adequacy || null,
                eudr_check_passed: inspectForm.eudr_check_passed || false,
                female_participation_pct: inspectForm.female_participation_pct ? Number(inspectForm.female_participation_pct) : null,
            };
            if (editingItem) {
                await pb.collection('model_inspections').update(editingItem.id, data);
            } else {
                await pb.collection('model_inspections').create(data);
            }
            setShowInspectForm(false);
            setEditingItem(null);
            setInspectForm(emptyInspect);
            const ins = await pb.collection('model_inspections').getFullList({ filter: `model_id='${model.id}'`, sort: '-inspection_date' }).catch(() => []);
            setInspections(ins);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConsum = async () => {
        if (!consumForm.item_name.trim()) return alert(appLang === 'vi' ? 'Vui lòng nhập tên hạng mục' : 'Please enter item name');
        setSaving(true);
        try {
            const qty = consumForm.quantity ? Number(consumForm.quantity) : null;
            const price = consumForm.unit_price ? Number(consumForm.unit_price) : null;
            const total = consumForm.total_cost ? Number(consumForm.total_cost) : (qty && price ? qty * price : null);
            const data = {
                model_id: model.id,
                record_date: consumForm.record_date,
                category: consumForm.category,
                item_name: consumForm.item_name,
                quantity: qty,
                unit: consumForm.unit || null,
                unit_price: price,
                total_cost: total,
                notes: consumForm.notes || null,
            };
            if (editingItem) {
                await pb.collection('model_consumables').update(editingItem.id, data);
            } else {
                await pb.collection('model_consumables').create(data);
            }
            setShowConsumForm(false);
            setEditingItem(null);
            setConsumForm(emptyConsum);
            const con = await pb.collection('model_consumables').getFullList({ filter: `model_id='${model.id}'`, sort: '-record_date' }).catch(() => []);
            setConsumables(con);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRecord = async (collection, id, refreshFn) => {
        if (!confirm(appLang === 'vi' ? 'Bạn có chắc muốn xóa?' : 'Are you sure you want to delete?')) return;
        try {
            await pb.collection(collection).delete(id);
            refreshFn();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleSaveFarmer = async () => {
        setSaving(true);
        try {
            const data = {
                full_name: farmerForm.full_name,
                gender: farmerForm.gender || null,
                phone: farmerForm.phone || null,
                village: farmerForm.village || null,
                commune: farmerForm.commune || null,
                district: farmerForm.district || null,
                province: farmerForm.province || null,
                ethnicity: farmerForm.ethnicity || null,
                economic_class: farmerForm.economic_class || null,
                coffee_years: farmerForm.coffee_years ? Number(farmerForm.coffee_years) : null,
                education: farmerForm.education || null,
                cooperative_member: farmerForm.cooperative_member || false,
                household_members: farmerForm.household_members ? Number(farmerForm.household_members) : null,
                id_card: farmerForm.id_card || null,
                notes: farmerForm.notes || null,
                id_card_issue_date: farmerForm.id_card_issue_date || null,
                id_card_issue_place: farmerForm.id_card_issue_place || null,
                marital_status: farmerForm.marital_status || null,
                women_decision_role: farmerForm.women_decision_role || null,
                access_to_credit: farmerForm.access_to_credit || false,
                credit_source: farmerForm.credit_source || null,
            };
            await pb.collection('farmers').update(farmer.id, data);
            const updated = await pb.collection('farmers').getOne(farmer.id);
            setFarmer(updated);
            setShowFarmerForm(false);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFarm = async () => {
        setSaving(true);
        try {
            const data = {
                plot_name: farmForm.farm_name || null,
                area_ha: farmForm.total_area ? Number(farmForm.total_area) : null,
                total_area: farmForm.total_area ? Number(farmForm.total_area) : null,
                coffee_area: farmForm.coffee_area ? Number(farmForm.coffee_area) : null,
                intercrop_area: farmForm.intercrop_area ? Number(farmForm.intercrop_area) : null,
                intercrop_details: farmForm.intercrop_details || null,
                soil_type: farmForm.soil_type || null,
                soil_ph: farmForm.soil_ph ? Number(farmForm.soil_ph) : null,
                slope: farmForm.slope || null,
                water_source: farmForm.water_source || null,
                irrigation_system: farmForm.irrigation_system || null,
                elevation: farmForm.elevation ? Number(farmForm.elevation) : null,
                gps_lat: farmForm.gps_lat ? Number(farmForm.gps_lat) : null,
                gps_long: farmForm.gps_long ? Number(farmForm.gps_long) : null,
                grass_cover: farmForm.grass_cover || null,
                shade_trees: farmForm.shade_trees ? Number(farmForm.shade_trees) : null,
                notes: farmForm.notes || null,
                // Layer 2
                lurc_status: farmForm.lurc_status || null,
                lurc_number: farmForm.lurc_number || null,
                lurc_issue_date: farmForm.lurc_issue_date || null,
                lurc_area_ha: farmForm.lurc_area_ha ? Number(farmForm.lurc_area_ha) : null,
                ownership_status: farmForm.ownership_status || null,
                // Layer 3
                coffee_variety: farmForm.coffee_variety || null,
                planting_density: farmForm.planting_density ? Number(farmForm.planting_density) : null,
                row_spacing_m: farmForm.row_spacing_m ? Number(farmForm.row_spacing_m) : null,
                tree_spacing_m: farmForm.tree_spacing_m ? Number(farmForm.tree_spacing_m) : null,
                tree_age_avg: farmForm.tree_age_avg ? Number(farmForm.tree_age_avg) : null,
                // Layer 4
                soil_type_plot: farmForm.soil_type_plot || null,
                soil_ph_plot: farmForm.soil_ph_plot ? Number(farmForm.soil_ph_plot) : null,
                main_fertilizer_types: farmForm.main_fertilizer_types || null,
                fertilization_frequency: farmForm.fertilization_frequency || null,
                organic_input_pct: farmForm.organic_input_pct ? Number(farmForm.organic_input_pct) : null,
                // Layer 5
                water_source_plot: farmForm.water_source_plot || null,
                irrigation_method: farmForm.irrigation_method || null,
                irrigation_frequency: farmForm.irrigation_frequency || null,
                water_storage: farmForm.water_storage || false,
                // Layer 6
                main_pests: farmForm.main_pests || null,
                main_diseases: farmForm.main_diseases || null,
                ipm_practiced: farmForm.ipm_practiced || false,
                pesticide_certified: farmForm.pesticide_certified || false,
                // Layer 7
                harvest_method: farmForm.harvest_method || null,
                processing_method: farmForm.processing_method || null,
                // Layer 8
                eudr_status: farmForm.eudr_status || null,
                deforestation_risk: farmForm.deforestation_risk || null,
                traceability_code: farmForm.traceability_code || null,
                farm_map_verified: farmForm.farm_map_verified || false,
            };
            if (farm?.expand?.farmer_id || farm?.farmer_id) {
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
            setShowFarmForm(false);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const openEditFarmer = () => {
        setFarmerForm({
            full_name: farmer?.full_name || '',
            gender: farmer?.gender || '',
            phone: farmer?.phone || '',
            village: farmer?.village || '',
            commune: farmer?.commune || '',
            district: farmer?.district || '',
            province: farmer?.province || '',
            ethnicity: farmer?.ethnicity || '',
            economic_class: farmer?.economic_class || '',
            coffee_years: farmer?.coffee_years || '',
            education: farmer?.education || '',
            cooperative_member: farmer?.cooperative_member || false,
            household_members: farmer?.household_members || '',
            id_card: farmer?.id_card || '',
            notes: farmer?.notes || '',
            id_card_issue_date: farmer?.id_card_issue_date || '',
            id_card_issue_place: farmer?.id_card_issue_place || '',
            marital_status: farmer?.marital_status || '',
            women_decision_role: farmer?.women_decision_role || '',
            access_to_credit: farmer?.access_to_credit || false,
            credit_source: farmer?.credit_source || '',
        });
        setShowFarmerForm(true);
    };

    const openEditFarm = () => {
        setFarmForm({
            farm_name: farm?.plot_name || farm?.farm_name || '',
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
            notes: farm?.notes || '',
            // Layer 2
            lurc_status: farm?.lurc_status || '',
            lurc_number: farm?.lurc_number || '',
            lurc_issue_date: farm?.lurc_issue_date?.split('T')[0] || '',
            lurc_area_ha: farm?.lurc_area_ha || '',
            ownership_status: farm?.ownership_status || '',
            satellite_verified: farm?.satellite_verified || false,
            // Layer 3
            coffee_variety: farm?.coffee_variety || '',
            planting_density: farm?.planting_density || '',
            row_spacing_m: farm?.row_spacing_m || '',
            tree_spacing_m: farm?.tree_spacing_m || '',
            tree_age_avg: farm?.tree_age_avg || '',
            // Layer 4
            soil_type_plot: farm?.soil_type_plot || '',
            soil_ph_plot: farm?.soil_ph_plot || '',
            main_fertilizer_types: farm?.main_fertilizer_types || '',
            fertilization_frequency: farm?.fertilization_frequency || '',
            organic_input_pct: farm?.organic_input_pct || '',
            // Layer 5
            water_source_plot: farm?.water_source_plot || '',
            irrigation_method: farm?.irrigation_method || '',
            irrigation_frequency: farm?.irrigation_frequency || '',
            water_storage: farm?.water_storage || false,
            // Layer 6
            main_pests: farm?.main_pests || '',
            main_diseases: farm?.main_diseases || '',
            ipm_practiced: farm?.ipm_practiced || false,
            pesticide_certified: farm?.pesticide_certified || false,
            // Layer 7
            harvest_method: farm?.harvest_method || '',
            processing_method: farm?.processing_method || '',
            // Layer 8
            eudr_status: farm?.eudr_status || '',
            deforestation_risk: farm?.deforestation_risk || '',
            traceability_code: farm?.traceability_code || '',
            farm_map_verified: farm?.farm_map_verified || false,
        });
        setShowFarmForm(true);
    };

    const refreshDiary = async () => {
        const d = await pb.collection('model_diary').getFullList({ filter: `model_id='${model.id}'`, sort: '-diary_date' }).catch(() => []);
        setDiary(d);
    };
    const refreshInspections = async () => {
        const ins = await pb.collection('model_inspections').getFullList({ filter: `model_id='${model.id}'`, sort: '-inspection_date' }).catch(() => []);
        setInspections(ins);
    };
    const refreshConsumables = async () => {
        const con = await pb.collection('model_consumables').getFullList({ filter: `model_id='${model.id}'`, sort: '-record_date' }).catch(() => []);
        setConsumables(con);
    };

    const openEditDiary = (item) => {
        setDiaryForm({
            diary_date: item.diary_date?.split('T')[0] || item.diary_date?.split(' ')[0] || today(),
            activity_type: item.activity_type || 'fertilize',
            description: item.description || '',
            material_name: item.material_name || '',
            material_amount: item.material_amount || '',
            material_unit: item.material_unit || 'kg',
            labor_hours: item.labor_hours || '',
            labor_cost: item.labor_cost || '',
            material_cost: item.material_cost || '',
            gcp_compliant: item.gcp_compliant || false,
            weather: item.weather || '',
            notes: item.notes || '',
        });
        setEditingItem(item);
        setShowDiaryForm(true);
    };

    const openEditInspect = (item) => {
        setInspectForm({
            inspection_date: item.inspection_date?.split('T')[0] || item.inspection_date?.split(' ')[0] || today(),
            inspection_type: item.inspection_type || 'quarterly',
            growth_quality: item.growth_quality || '',
            pest_status: item.pest_status || '',
            pest_details: item.pest_details || '',
            soil_condition: item.soil_condition || '',
            water_status: item.water_status || '',
            tree_health_pct: item.tree_health_pct || '',
            fruit_quality: item.fruit_quality || '',
            recommendations: item.recommendations || '',
            follow_up_actions: item.follow_up_actions || '',
            notes: item.notes || '',
            soil_ph_sample: item.soil_ph_sample || '',
            irrigation_adequacy: item.irrigation_adequacy || '',
            eudr_check_passed: item.eudr_check_passed || false,
            female_participation_pct: item.female_participation_pct || '',
        });
        setEditingItem(item);
        setShowInspectForm(true);
    };

    const openEditConsum = (item) => {
        setConsumForm({
            record_date: item.record_date?.split('T')[0] || item.record_date?.split(' ')[0] || today(),
            category: item.category || 'fertilizer',
            item_name: item.item_name || '',
            quantity: item.quantity || '',
            unit: item.unit || 'kg',
            unit_price: item.unit_price || '',
            total_cost: item.total_cost || '',
            notes: item.notes || '',
        });
        setEditingItem(item);
        setShowConsumForm(true);
    };

    // ── Reusable UI components ──

    const InfoRow = ({ label, value, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            {icon && <i className={`fas ${icon}`} style={{ width: '20px', color: 'var(--coffee-primary)', textAlign: 'center' }}></i>}
            <span style={{ flex: 1, fontSize: '13px', color: '#64748b' }}>{label}</span>
            <span style={{ fontWeight: 600, color: 'var(--coffee-dark)', fontSize: '14px' }}>{value || '---'}</span>
        </div>
    );

    const SectionCard = ({ title, icon, children, action }) => (
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--coffee-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className={`fas ${icon}`} style={{ color: 'var(--coffee-primary)' }}></i>{title}
                </h4>
                {action}
            </div>
            {children}
        </div>
    );

    const AddButton = ({ onClick, label }) => (
        <button onClick={onClick} style={{
            padding: '6px 14px', border: 'none', borderRadius: '10px', cursor: 'pointer',
            background: 'var(--coffee-primary)', color: 'white', fontSize: '12px', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '5px'
        }}>
            <i className="fas fa-plus"></i> {label || (appLang === 'vi' ? 'Thêm' : 'Add')}
        </button>
    );

    // ── Modal overlay ──
    const ModalOverlay = ({ show, title, onClose, onSave, children }) => {
        if (!show) return null;
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
            }} onClick={onClose}>
                <div style={{
                    background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '600px',
                    maxHeight: '85vh', overflow: 'auto', padding: '24px',
                    animation: 'slideUp 0.3s ease'
                }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--coffee-dark)' }}>{title}</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    {children}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button onClick={onClose} style={{
                            flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                            background: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: '#64748b'
                        }}>{appLang === 'vi' ? 'Hủy' : 'Cancel'}</button>
                        <button onClick={onSave} disabled={saving} style={{
                            flex: 1, padding: '12px', border: 'none', borderRadius: '12px',
                            background: 'var(--coffee-primary)', color: 'white', fontSize: '14px', fontWeight: 700,
                            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1
                        }}>
                            {saving ? <i className="fas fa-spinner fa-spin"></i> : (editingItem ? (appLang === 'vi' ? 'Cập nhật' : 'Update') : (appLang === 'vi' ? 'Lưu' : 'Save'))}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ===== TAB CONTENT =====

    const renderOverview = () => (
        <>
            <SectionCard title={appLang === 'vi' ? 'Thông tin mô hình' : 'Model Info'} icon="fa-seedling">
                <InfoRow label={appLang === 'vi' ? 'Mã mô hình' : 'Model code'} value={model.model_code} icon="fa-hashtag" />
                <InfoRow label={appLang === 'vi' ? 'Tên' : 'Name'} value={model.name || model.model_name} icon="fa-tag" />
                <InfoRow label={appLang === 'vi' ? 'Mô tả' : 'Description'} value={model.description} icon="fa-align-left" />
                <InfoRow label={appLang === 'vi' ? 'Vị trí' : 'Location'} value={model.location || (model.commune && model.village ? `${model.village}, ${model.commune}` : model.commune)} icon="fa-map-marker-alt" />
                <InfoRow label={appLang === 'vi' ? 'Tỉnh' : 'Province'} value={model.province || 'Gia Lai'} icon="fa-globe" />
                <InfoRow label={appLang === 'vi' ? 'Diện tích' : 'Area'} value={(model.area || model.target_area) ? `${model.area || model.target_area} ha` : null} icon="fa-ruler-combined" />
                <InfoRow label={appLang === 'vi' ? 'Loại cà phê' : 'Coffee type'} value={model.coffee_type} icon="fa-mug-hot" />
                <InfoRow label={appLang === 'vi' ? 'Trạng thái' : 'Status'} value={model.status?.toUpperCase()} icon="fa-flag" />
                <InfoRow label={appLang === 'vi' ? 'Dữ liệu' : 'Data'} value={model.data_status} icon="fa-database" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                    <i className="fas fa-user-tie" style={{ width: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}></i>
                    <span style={{ fontSize: '12px', color: '#64748b', minWidth: '100px' }}>{appLang === 'vi' ? 'Cán bộ kiểm tra' : appLang === 'en' ? 'Inspector' : 'Pô dlăng'}</span>
                    {canEdit ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {inspectorManual ? (
                                    <input
                                        type="text"
                                        value={model.inspector_name || ''}
                                        onChange={async (e) => {
                                            const val = e.target.value;
                                            model.inspector_name = val;
                                            try { await pb.collection('demo_models').update(model.id, { inspector_name: val }); } catch {}
                                        }}
                                        placeholder={appLang === 'vi' ? 'Nhập tên...' : 'Type name...'}
                                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', background: '#f8fafc' }}
                                    />
                                ) : (
                                    <select
                                        value={model.inspector_name || ''}
                                        onChange={async (e) => {
                                            const val = e.target.value;
                                            model.inspector_name = val;
                                            try { await pb.collection('demo_models').update(model.id, { inspector_name: val }); } catch {}
                                        }}
                                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b', background: '#f8fafc' }}
                                    >
                                        <option value="">{appLang === 'vi' ? '-- Chọn cán bộ --' : '-- Select --'}</option>
                                        {orgUsers.map(u => (
                                            <option key={u.id} value={u.full_name}>{u.full_name}{u.role ? ` (${u.role})` : ''}</option>
                                        ))}
                                    </select>
                                )}
                                <span
                                    onClick={() => setInspectorManual(!inspectorManual)}
                                    style={{ fontSize: '10px', color: '#3b82f6', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'underline' }}
                                >
                                    {inspectorManual
                                        ? (appLang === 'vi' ? 'Chọn DS' : 'List')
                                        : (appLang === 'vi' ? 'Tự nhập' : 'Manual')}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: model.inspector_name ? '#1e293b' : '#cbd5e1' }}>
                            {model.inspector_name || '---'}
                        </span>
                    )}
                </div>
            </SectionCard>

            <div className="mdv-overview-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    { label: appLang === 'vi' ? 'Nhật ký' : 'Diary', count: diary.length, color: '#166534', bg: '#dcfce7', icon: 'fa-book' },
                    { label: appLang === 'vi' ? 'Kiểm tra' : 'Inspections', count: inspections.length, color: '#1e40af', bg: '#dbeafe', icon: 'fa-clipboard-check' },
                    { label: appLang === 'vi' ? 'Tiêu hao' : 'Costs', count: consumables.length, color: '#854d0e', bg: '#fef9c3', icon: 'fa-receipt' }
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <i className={`fas ${s.icon}`} style={{ fontSize: '20px', color: s.color }}></i>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, marginTop: '8px' }}>{s.count}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: s.color }}>{s.label}</div>
                    </div>
                ))}
            </div>
        </>
    );

    const renderFarmer = () => (
        <>
            {farmer ? (
                <>
                    <SectionCard title={appLang === 'vi' ? 'Chủ hộ mô hình' : 'Model Owner'} icon="fa-user"
                        action={canEdit ? <AddButton onClick={openEditFarmer} label={appLang === 'vi' ? 'Sửa' : 'Edit'} /> : null}>
                        <InfoRow label={appLang === 'vi' ? 'Họ tên' : 'Full name'} value={farmer.full_name} icon="fa-user" />
                        <InfoRow label={appLang === 'vi' ? 'Mã' : 'Code'} value={farmer.farmer_code} icon="fa-id-badge" />
                        <InfoRow label={appLang === 'vi' ? 'Giới tính' : 'Gender'} value={farmer.gender} icon="fa-venus-mars" />
                        <InfoRow label={appLang === 'vi' ? 'Dân tộc' : 'Ethnicity'} value={farmer.ethnicity} icon="fa-users" />
                        <InfoRow label={appLang === 'vi' ? 'SĐT' : 'Phone'} value={farmer.phone} icon="fa-phone" />
                        <InfoRow label={appLang === 'vi' ? 'CMND/CCCD' : 'ID Card'} value={farmer.id_card} icon="fa-id-card" />
                        <InfoRow label={appLang === 'vi' ? 'Thôn' : 'Village'} value={farmer.village} icon="fa-home" />
                        <InfoRow label={appLang === 'vi' ? 'Xã' : 'Commune'} value={farmer.commune} icon="fa-map" />
                        <InfoRow label={appLang === 'vi' ? 'Huyện' : 'District'} value={farmer.district} icon="fa-map-signs" />
                        <InfoRow label={appLang === 'vi' ? 'Tỉnh' : 'Province'} value={farmer.province} icon="fa-globe" />
                        <InfoRow label={appLang === 'vi' ? 'Kinh tế hộ' : 'Economic class'} value={farmer.economic_class} icon="fa-chart-bar" />
                        <InfoRow label={appLang === 'vi' ? 'Năm trồng cà phê' : 'Coffee experience'} value={farmer.coffee_years ? `${farmer.coffee_years} ${appLang === 'vi' ? 'năm' : 'years'}` : null} icon="fa-coffee" />
                        <InfoRow label={appLang === 'vi' ? 'Học vấn' : 'Education'} value={farmer.education} icon="fa-graduation-cap" />
                        <InfoRow label={appLang === 'vi' ? 'Thành viên HTX' : 'Coop member'} value={farmer.cooperative_member ? (appLang === 'vi' ? 'Có' : 'Yes') : (appLang === 'vi' ? 'Không' : 'No')} icon="fa-handshake" />
                        <InfoRow label={appLang === 'vi' ? 'Số thành viên hộ' : 'Household size'} value={farmer.household_members} icon="fa-people-arrows" />
                    </SectionCard>

                    {members.length > 0 && (
                        <SectionCard title={`${appLang === 'vi' ? 'Thành viên hộ' : 'Household'} (${members.length})`} icon="fa-people-arrows">
                            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>{appLang === 'vi' ? 'Tên' : 'Name'}</th>
                                        <th style={{ padding: '8px' }}>{appLang === 'vi' ? 'GT' : 'Gender'}</th>
                                        <th style={{ padding: '8px' }}>{appLang === 'vi' ? 'Năm sinh' : 'Birth'}</th>
                                        <th style={{ padding: '8px' }}>{appLang === 'vi' ? 'Quan hệ' : 'Relation'}</th>
                                        <th style={{ padding: '8px' }}>{appLang === 'vi' ? 'Tham gia SX' : 'Farming'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{m.member_name}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.gender}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.birth_year}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.relation_to_head}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                {m.coffee_participation ? <i className="fas fa-check" style={{ color: '#22c55e' }}></i> : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </SectionCard>
                    )}

                    {income && (
                        <SectionCard title={`${appLang === 'vi' ? 'Thu nhập năm' : 'Income'} ${income.year || 2025}`} icon="fa-coins">
                            <InfoRow label={appLang === 'vi' ? 'Tổng thu nhập ròng' : 'Net income'} value={income.total_income ? `${income.total_income} tr.đ` : null} icon="fa-wallet" />
                            <InfoRow label={appLang === 'vi' ? 'Từ cà phê (ròng)' : 'Coffee net'} value={income.coffee_net ? `${income.coffee_net} tr.đ` : null} icon="fa-mug-hot" />
                            <InfoRow label={appLang === 'vi' ? 'Doanh thu cà phê' : 'Coffee revenue'} value={income.coffee_revenue ? `${income.coffee_revenue} tr.đ` : null} icon="fa-arrow-up" />
                            <InfoRow label={appLang === 'vi' ? 'Chi phí cà phê' : 'Coffee cost'} value={income.coffee_cost ? `${income.coffee_cost} tr.đ` : null} icon="fa-arrow-down" />
                            <InfoRow label={appLang === 'vi' ? 'Sản lượng' : 'Production'} value={income.production_tons ? `${income.production_tons} ${appLang === 'vi' ? 'tấn' : 'tons'}` : null} icon="fa-box" />
                            <InfoRow label={appLang === 'vi' ? 'Tỷ trọng NN' : 'Agri ratio'} value={income.agri_income_ratio ? `${(income.agri_income_ratio * 100).toFixed(0)}%` : null} icon="fa-percent" />
                        </SectionCard>
                    )}
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-user-slash" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                    <p>{appLang === 'vi' ? 'Chưa gán nông hộ cho mô hình này' : 'No farmer assigned yet'}</p>
                </div>
            )}

            {/* Farmer Edit Modal */}
            <ModalOverlay
                show={showFarmerForm}
                title={appLang === 'vi' ? 'Cập nhật thông tin nông hộ' : 'Update Farmer Info'}
                onClose={() => setShowFarmerForm(false)}
                onSave={handleSaveFarmer}
            >
                <FormField label={appLang === 'vi' ? 'Họ tên' : 'Full Name'} required>
                    <input value={farmerForm.full_name || ''} onChange={e => setFarmerForm({ ...farmerForm, full_name: e.target.value })} style={inputStyle} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Giới tính' : 'Gender'}>
                        <select value={farmerForm.gender || ''} onChange={e => setFarmerForm({ ...farmerForm, gender: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Nam">{appLang === 'vi' ? 'Nam' : 'Male'}</option>
                            <option value="Nữ">{appLang === 'vi' ? 'Nữ' : 'Female'}</option>
                            <option value="Khác">{appLang === 'vi' ? 'Khác' : 'Other'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Dân tộc' : 'Ethnicity'}>
                        <input value={farmerForm.ethnicity || ''} onChange={e => setFarmerForm({ ...farmerForm, ethnicity: e.target.value })} style={inputStyle} placeholder="Kinh, Ede, Jarai..." />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'SĐT' : 'Phone'}>
                        <input value={farmerForm.phone || ''} onChange={e => setFarmerForm({ ...farmerForm, phone: e.target.value })} style={inputStyle} placeholder="09xx..." />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'CMND/CCCD' : 'ID Card'}>
                        <input value={farmerForm.id_card || ''} onChange={e => setFarmerForm({ ...farmerForm, id_card: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Thôn' : 'Village'}>
                        <input value={farmerForm.village || ''} onChange={e => setFarmerForm({ ...farmerForm, village: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Xã' : 'Commune'}>
                        <input value={farmerForm.commune || ''} onChange={e => setFarmerForm({ ...farmerForm, commune: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Huyện' : 'District'}>
                        <input value={farmerForm.district || ''} onChange={e => setFarmerForm({ ...farmerForm, district: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Tỉnh' : 'Province'}>
                        <input value={farmerForm.province || ''} onChange={e => setFarmerForm({ ...farmerForm, province: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Kinh tế hộ' : 'Economic Class'}>
                        <select value={farmerForm.economic_class || ''} onChange={e => setFarmerForm({ ...farmerForm, economic_class: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Nghèo">{appLang === 'vi' ? 'Nghèo' : 'Poor'}</option>
                            <option value="Cận nghèo">{appLang === 'vi' ? 'Cận nghèo' : 'Near poor'}</option>
                            <option value="Bình thường">{appLang === 'vi' ? 'Bình thường' : 'Average'}</option>
                            <option value="Khá">{appLang === 'vi' ? 'Khá' : 'Above avg'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Học vấn' : 'Education'}>
                        <input value={farmerForm.education || ''} onChange={e => setFarmerForm({ ...farmerForm, education: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Lớp 9, THPT...' : '9th grade, high school...'} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Năm trồng cà phê' : 'Coffee years'}>
                        <input type="number" value={farmerForm.coffee_years || ''} onChange={e => setFarmerForm({ ...farmerForm, coffee_years: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Số thành viên hộ' : 'Household size'}>
                        <input type="number" value={farmerForm.household_members || ''} onChange={e => setFarmerForm({ ...farmerForm, household_members: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Thành viên HTX' : 'Coop member'}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={farmerForm.cooperative_member || false} onChange={e => setFarmerForm({ ...farmerForm, cooperative_member: e.target.checked })} />
                            <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Có' : 'Yes'}</span>
                        </label>
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Ghi chú' : 'Notes'}>
                    <textarea value={farmerForm.notes || ''} onChange={e => setFarmerForm({ ...farmerForm, notes: e.target.value })}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                </FormField>
            </ModalOverlay>
        </>
    );

    const renderFarm = () => (
        <>
            {/* ── LAYER 2: Land & Legal ── */}
            {farm && (
                <SectionCard
                    title={appLang === 'vi' ? 'Lớp 2: Đất đai & Pháp lý' : 'Layer 2: Land & Legal'}
                    icon="fa-file-signature"
                    action={canEdit ? <AddButton onClick={openEditFarm} label={appLang === 'vi' ? 'Sửa' : 'Edit'} /> : null}
                >
                    <InfoRow label={appLang === 'vi' ? 'Tên mảnh đất' : 'Plot Name'} value={farm.plot_name || farm.farm_name} icon="fa-tag" />
                    <InfoRow label={appLang === 'vi' ? 'Tổng diện tích' : 'Total Area'} value={farm.total_area ? `${farm.total_area} ha` : null} icon="fa-ruler" />
                    <InfoRow label={appLang === 'vi' ? 'Sổ đỏ / GCNQSDĐ' : 'LURC Status'} value={farm.lurc_status} icon="fa-certificate" />
                    <InfoRow label={appLang === 'vi' ? 'Số sổ đỏ' : 'LURC Number'} value={farm.lurc_number} icon="fa-id-badge" />
                    <InfoRow label={appLang === 'vi' ? 'Ngày cấp sổ' : 'LURC Issue Date'} value={farm.lurc_issue_date?.split('T')[0]} icon="fa-calendar" />
                    <InfoRow label={appLang === 'vi' ? 'DT theo sổ (ha)' : 'LURC Area (ha)'} value={farm.lurc_area_ha ? `${farm.lurc_area_ha} ha` : null} icon="fa-ruler-combined" />
                    <InfoRow label={appLang === 'vi' ? 'Hình thức sở hữu' : 'Ownership Status'} value={farm.ownership_status} icon="fa-handshake" />
                    <InfoRow label={appLang === 'vi' ? 'GPS Lat' : 'GPS Lat'} value={farm.gps_lat} icon="fa-map-pin" />
                    <InfoRow label={appLang === 'vi' ? 'GPS Long' : 'GPS Long'} value={farm.gps_long} icon="fa-map-pin" />
                    <InfoRow label={appLang === 'vi' ? 'Xác minh vệ tinh' : 'Satellite Verified'}
                        value={farm.satellite_verified ? (appLang === 'vi' ? 'Có' : 'Yes') : (appLang === 'vi' ? 'Chưa' : 'No')} icon="fa-satellite" />
                </SectionCard>
            )}

            {/* ── LAYER 3: Farm Structure ── */}
            {farm && (
                <SectionCard
                    title={appLang === 'vi' ? 'Lớp 3: Cơ cấu trang trại' : 'Layer 3: Farm Structure'}
                    icon="fa-sitemap"
                >
                    <InfoRow label={appLang === 'vi' ? 'Diện tích cà phê (ha)' : 'Coffee Area (ha)'} value={farm.coffee_area ? `${farm.coffee_area} ha` : null} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'Diện tích xen canh (ha)' : 'Intercrop Area (ha)'} value={farm.intercrop_area ? `${farm.intercrop_area} ha` : null} icon="fa-tree" />
                    <InfoRow label={appLang === 'vi' ? 'Cây xen canh' : 'Intercrop Details'} value={farm.intercrop_details} icon="fa-seedling" />
                    <InfoRow label={appLang === 'vi' ? 'Giống cà phê' : 'Coffee Variety'} value={farm.coffee_variety} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'Mật độ trồng (cây/ha)' : 'Planting Density (trees/ha)'} value={farm.planting_density ? `${farm.planting_density}` : null} icon="fa-th" />
                    <InfoRow label={appLang === 'vi' ? 'Khoảng cách hàng (m)' : 'Row Spacing (m)'} value={farm.row_spacing_m ? `${farm.row_spacing_m} m` : null} icon="fa-arrows-alt-h" />
                    <InfoRow label={appLang === 'vi' ? 'Khoảng cách cây (m)' : 'Tree Spacing (m)'} value={farm.tree_spacing_m ? `${farm.tree_spacing_m} m` : null} icon="fa-arrows-alt-v" />
                    <InfoRow label={appLang === 'vi' ? 'Tuổi cây TB (năm)' : 'Avg Tree Age (yr)'} value={farm.tree_age_avg ? `${farm.tree_age_avg} ${appLang === 'vi' ? 'năm' : 'yrs'}` : null} icon="fa-hourglass-half" />
                    <InfoRow label={appLang === 'vi' ? 'Cây bóng mát' : 'Shade Trees'} value={farm.shade_trees} icon="fa-tree" />
                    <InfoRow label={appLang === 'vi' ? 'Cỏ phủ' : 'Grass Cover'} value={farm.grass_cover} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'Độ cao (m)' : 'Elevation (m)'} value={farm.elevation ? `${farm.elevation} m` : null} icon="fa-arrow-up" />
                    <InfoRow label={appLang === 'vi' ? 'Độ dốc' : 'Slope'} value={farm.slope} icon="fa-signal" />
                </SectionCard>
            )}

            {/* ── LAYER 4: Soil & Fertility ── */}
            {farm && (
                <SectionCard
                    title={appLang === 'vi' ? 'Lớp 4: Đất & Phì nhiêu' : 'Layer 4: Soil & Fertility'}
                    icon="fa-flask"
                >
                    <InfoRow label={appLang === 'vi' ? 'Loại đất' : 'Soil Type'} value={farm.soil_type_plot} icon="fa-mountain" />
                    <InfoRow label="pH" value={farm.soil_ph_plot} icon="fa-flask" />
                    <InfoRow label={appLang === 'vi' ? 'Phân bón chính' : 'Main Fertilizer Types'} value={farm.main_fertilizer_types} icon="fa-vial" />
                    <InfoRow label={appLang === 'vi' ? 'Tần suất bón phân' : 'Fertilization Frequency'} value={farm.fertilization_frequency} icon="fa-calendar-alt" />
                    <InfoRow label={appLang === 'vi' ? 'Tỷ lệ hữu cơ (%)' : 'Organic Input (%)'} value={farm.organic_input_pct ? `${farm.organic_input_pct}%` : null} icon="fa-recycle" />
                </SectionCard>
            )}

            {/* ── LAYER 5: Water & Irrigation ── */}
            {farm && (
                <SectionCard
                    title={appLang === 'vi' ? 'Lớp 5: Nước & Tưới tiêu' : 'Layer 5: Water & Irrigation'}
                    icon="fa-tint"
                >
                    <InfoRow label={appLang === 'vi' ? 'Nguồn nước' : 'Water Source'} value={farm.water_source_plot} icon="fa-water" />
                    <InfoRow label={appLang === 'vi' ? 'Phương pháp tưới' : 'Irrigation Method'} value={farm.irrigation_method} icon="fa-shower" />
                    <InfoRow label={appLang === 'vi' ? 'Tần suất tưới' : 'Irrigation Frequency'} value={farm.irrigation_frequency} icon="fa-clock" />
                    <InfoRow label={appLang === 'vi' ? 'Có bể chứa nước' : 'Water Storage'}
                        value={farm.water_storage ? (appLang === 'vi' ? 'Có' : 'Yes') : (appLang === 'vi' ? 'Không' : 'No')} icon="fa-box" />
                </SectionCard>
            )}

            {/* ── LAYER 6: Crop Protection ── */}
            {farm && (
                <SectionCard
                    title={appLang === 'vi' ? 'Lớp 6: Bảo vệ cây trồng' : 'Layer 6: Crop Protection'}
                    icon="fa-bug"
                >
                    <InfoRow label={appLang === 'vi' ? 'Sâu hại chính' : 'Main Pests'} value={farm.main_pests} icon="fa-bug" />
                    <InfoRow label={appLang === 'vi' ? 'Bệnh chính' : 'Main Diseases'} value={farm.main_diseases} icon="fa-virus" />
                    <InfoRow label={appLang === 'vi' ? 'Áp dụng IPM' : 'IPM Practiced'}
                        value={farm.ipm_practiced ? (appLang === 'vi' ? 'Có' : 'Yes') : (appLang === 'vi' ? 'Không' : 'No')} icon="fa-shield-alt" />
                    <InfoRow label={appLang === 'vi' ? 'Thuốc trong danh mục' : 'Pesticide Certified'}
                        value={farm.pesticide_certified ? (appLang === 'vi' ? 'Có' : 'Yes') : (appLang === 'vi' ? 'Không' : 'No')} icon="fa-check-circle" />
                </SectionCard>
            )}

            {/* ── LAYER 7: Production & Yield ── */}
            {farm && (
                <SectionCard
                    title={appLang === 'vi' ? 'Lớp 7: Sản xuất & Năng suất' : 'Layer 7: Production & Yield'}
                    icon="fa-box"
                >
                    <InfoRow label={appLang === 'vi' ? 'Phương pháp thu hoạch' : 'Harvest Method'} value={farm.harvest_method} icon="fa-hand-holding" />
                    <InfoRow label={appLang === 'vi' ? 'Phương pháp chế biến' : 'Processing Method'} value={farm.processing_method} icon="fa-industry" />
                </SectionCard>
            )}

            {/* ── LAYER 8: Compliance & Traceability ── */}
            {farm && (
                <SectionCard
                    title={appLang === 'vi' ? 'Lớp 8: Tuân thủ & Truy xuất' : 'Layer 8: Compliance & Traceability'}
                    icon="fa-clipboard-list"
                >
                    <InfoRow label={appLang === 'vi' ? 'Trạng thái EUDR' : 'EUDR Status'} value={farm.eudr_status} icon="fa-shield-alt" />
                    <InfoRow label={appLang === 'vi' ? 'Rủi ro phá rừng' : 'Deforestation Risk'} value={farm.deforestation_risk} icon="fa-tree" />
                    <InfoRow label={appLang === 'vi' ? 'Mã truy xuất' : 'Traceability Code'} value={farm.traceability_code} icon="fa-qrcode" />
                    <InfoRow label={appLang === 'vi' ? 'Bản đồ đã xác minh' : 'Farm Map Verified'}
                        value={farm.farm_map_verified ? (appLang === 'vi' ? 'Có' : 'Yes') : (appLang === 'vi' ? 'Chưa' : 'No')} icon="fa-map-marked-alt" />
                </SectionCard>
            )}

            {!farm && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-map" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                    <p>{appLang === 'vi' ? 'Chưa gán trang trại' : 'No farm assigned yet'}</p>
                </div>
            )}

            {/* ── Land Plots (all Layer 2-8 data per plot) ── */}
            {plots.length > 0 && plots.map(p => (
                <SectionCard key={p.id}
                    title={`${appLang === 'vi' ? 'Mảnh đất' : 'Plot'}: ${p.plot_name || (appLang === 'vi' ? 'Mảnh đất' : 'Plot')} (${p.area_ha || 0} ha)`}
                    icon="fa-th-large"
                >
                    {/* Layer 2 */}
                    <InfoRow label={appLang === 'vi' ? 'Sổ đỏ' : 'LURC'} value={p.lurc_status || p.lurc_status_} icon="fa-certificate" />
                    <InfoRow label={appLang === 'vi' ? 'Diện tích (ha)' : 'Area (ha)'} value={p.area_ha ? `${p.area_ha} ha` : null} icon="fa-ruler" />
                    <InfoRow label={appLang === 'vi' ? 'GPS' : 'GPS'} value={p.gps_lat && p.gps_long ? `${p.gps_lat}, ${p.gps_long}` : null} icon="fa-map-pin" />
                    <InfoRow label={appLang === 'vi' ? 'Sở hữu' : 'Ownership'} value={p.ownership_status} icon="fa-handshake" />
                    {/* Layer 3 */}
                    <InfoRow label={appLang === 'vi' ? 'Giống cà phê' : 'Coffee Variety'} value={p.coffee_variety} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'Mật độ (cây/ha)' : 'Density (trees/ha)'} value={p.planting_density} icon="fa-th" />
                    <InfoRow label={appLang === 'vi' ? 'Tuổi cây TB' : 'Avg Tree Age'} value={p.tree_age_avg ? `${p.tree_age_avg} ${appLang === 'vi' ? 'năm' : 'yrs'}` : null} icon="fa-hourglass" />
                    {/* Layer 4 */}
                    <InfoRow label={appLang === 'vi' ? 'Loại đất' : 'Soil Type'} value={p.soil_type_plot || p.soil_type} icon="fa-mountain" />
                    <InfoRow label="pH" value={p.soil_ph_plot || p.soil_ph} icon="fa-flask" />
                    <InfoRow label={appLang === 'vi' ? 'Phân bón' : 'Fertilizer'} value={p.main_fertilizer_types} icon="fa-vial" />
                    {/* Layer 5 */}
                    <InfoRow label={appLang === 'vi' ? 'Nguồn nước' : 'Water Source'} value={p.water_source_plot || p.water_source} icon="fa-tint" />
                    <InfoRow label={appLang === 'vi' ? 'Tưới' : 'Irrigation'} value={p.irrigation_method || p.irrigation_system} icon="fa-shower" />
                    {/* Layer 6 */}
                    <InfoRow label={appLang === 'vi' ? 'Sâu hại' : 'Pests'} value={p.main_pests} icon="fa-bug" />
                    <InfoRow label={appLang === 'vi' ? 'IPM' : 'IPM'} value={p.ipm_practiced ? (appLang === 'vi' ? 'Có' : 'Yes') : null} icon="fa-shield" />
                    {/* Layer 7 */}
                    <InfoRow label={appLang === 'vi' ? 'Thu hoạch' : 'Harvest'} value={p.harvest_method} icon="fa-hand-holding" />
                    <InfoRow label={appLang === 'vi' ? 'Chế biến' : 'Processing'} value={p.processing_method} icon="fa-industry" />
                    {/* Layer 8 */}
                    <InfoRow label={appLang === 'vi' ? 'EUDR' : 'EUDR'} value={p.eudr_status} icon="fa-shield-alt" />
                    <InfoRow label={appLang === 'vi' ? 'Rủi ro phá rừng' : 'Deforestation'} value={p.deforestation_risk} icon="fa-tree" />
                    <InfoRow label={appLang === 'vi' ? 'Mã truy xuất' : 'Trace Code'} value={p.traceability_code} icon="fa-qrcode" />
                    {/* Summary */}
                    <InfoRow label={appLang === 'vi' ? 'Số cây' : 'Tree Count'} value={p.tree_count} icon="fa-tree" />
                    <InfoRow label={appLang === 'vi' ? 'Năng suất hiện tại' : 'Current Yield'} value={p.yield_current} icon="fa-chart-bar" />
                    <InfoRow label={appLang === 'vi' ? 'Cây xen canh' : 'Intercrop'} value={p.intercrop_species} icon="fa-seedling" />
                </SectionCard>
            ))}

            {/* ── Farm Edit Modal ── */}
            <ModalOverlay
                show={showFarmForm}
                title={appLang === 'vi' ? 'Cập nhật thông tin trang trại' : 'Update Farm Info'}
                onClose={() => setShowFarmForm(false)}
                onSave={handleSaveFarm}
            >
                {/* LAYER 2 */}
                <div style={{ paddingBottom: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', margin: '0 0 8px 0' }}>
                        <i className="fas fa-file-signature" style={{ marginRight: '6px' }}></i>
                        {appLang === 'vi' ? 'Lớp 2: Đất đai & Pháp lý' : 'Layer 2: Land & Legal'}
                    </h4>
                </div>
                <FormField label={appLang === 'vi' ? 'Tên trang trại' : 'Farm Name'}>
                    <input value={farmForm.farm_name || ''} onChange={e => setFarmForm({ ...farmForm, farm_name: e.target.value })} style={inputStyle} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Tổng DT (ha)' : 'Total Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.total_area || ''} onChange={e => setFarmForm({ ...farmForm, total_area: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Sổ đỏ / GCN' : 'LURC Status'}>
                        <select value={farmForm.lurc_status || ''} onChange={e => setFarmForm({ ...farmForm, lurc_status: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Có sổ đỏ">{appLang === 'vi' ? 'Có sổ đỏ' : 'Has LURC'}</option>
                            <option value="Đang làm sổ">{appLang === 'vi' ? 'Đang làm sổ' : 'Processing'}</option>
                            <option value="Chưa có sổ">{appLang === 'vi' ? 'Chưa có sổ' : 'No LURC'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Số sổ đỏ' : 'LURC Number'}>
                        <input value={farmForm.lurc_number || ''} onChange={e => setFarmForm({ ...farmForm, lurc_number: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Ngày cấp sổ' : 'LURC Issue Date'}>
                        <input type="date" value={farmForm.lurc_issue_date || ''} onChange={e => setFarmForm({ ...farmForm, lurc_issue_date: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'DT theo sổ (ha)' : 'LURC Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.lurc_area_ha || ''} onChange={e => setFarmForm({ ...farmForm, lurc_area_ha: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Sở hữu' : 'Ownership'}>
                        <select value={farmForm.ownership_status || ''} onChange={e => setFarmForm({ ...farmForm, ownership_status: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Sở hữu riêng">{appLang === 'vi' ? 'Sở hữu riêng' : 'Private'}</option>
                            <option value="Thuê mướn">{appLang === 'vi' ? 'Thuê mướn' : 'Rented'}</option>
                            <option value="Mượn">{appLang === 'vi' ? 'Mượn' : 'Borrowed'}</option>
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label="GPS Lat">
                        <input type="number" step="0.0001" value={farmForm.gps_lat || ''} onChange={e => setFarmForm({ ...farmForm, gps_lat: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label="GPS Long">
                        <input type="number" step="0.0001" value={farmForm.gps_long || ''} onChange={e => setFarmForm({ ...farmForm, gps_long: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Xác minh vệ tinh' : 'Satellite Verified'}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={farmForm.satellite_verified || false} onChange={e => setFarmForm({ ...farmForm, satellite_verified: e.target.checked })} />
                        <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Đã xác minh qua ảnh vệ tinh' : 'Verified via satellite imagery'}</span>
                    </label>
                </FormField>

                {/* LAYER 3 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', margin: '0 0 12px 0' }}>
                        <i className="fas fa-sitemap" style={{ marginRight: '6px' }}></i>
                        {appLang === 'vi' ? 'Lớp 3: Cơ cấu trang trại' : 'Layer 3: Farm Structure'}
                    </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'DT cà phê (ha)' : 'Coffee Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.coffee_area || ''} onChange={e => setFarmForm({ ...farmForm, coffee_area: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'DT xen canh (ha)' : 'Intercrop Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.intercrop_area || ''} onChange={e => setFarmForm({ ...farmForm, intercrop_area: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Giống cà phê' : 'Coffee Variety'}>
                        <input value={farmForm.coffee_variety || ''} onChange={e => setFarmForm({ ...farmForm, coffee_variety: e.target.value })} style={inputStyle} placeholder="Robusta, Arabica..." />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Mật độ (cây/ha)' : 'Density (trees/ha)'}>
                        <input type="number" value={farmForm.planting_density || ''} onChange={e => setFarmForm({ ...farmForm, planting_density: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Khoảng cách hàng (m)' : 'Row Spacing (m)'}>
                        <input type="number" step="0.1" value={farmForm.row_spacing_m || ''} onChange={e => setFarmForm({ ...farmForm, row_spacing_m: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Khoảng cách cây (m)' : 'Tree Spacing (m)'}>
                        <input type="number" step="0.1" value={farmForm.tree_spacing_m || ''} onChange={e => setFarmForm({ ...farmForm, tree_spacing_m: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Tuổi cây TB' : 'Avg Tree Age (yr)'}>
                        <input type="number" value={farmForm.tree_age_avg || ''} onChange={e => setFarmForm({ ...farmForm, tree_age_avg: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Số cây bóng mát' : 'Shade Trees'}>
                        <input type="number" value={farmForm.shade_trees || ''} onChange={e => setFarmForm({ ...farmForm, shade_trees: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Cỏ phủ' : 'Grass Cover'}>
                        <select value={farmForm.grass_cover || ''} onChange={e => setFarmForm({ ...farmForm, grass_cover: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Low">{appLang === 'vi' ? 'Thấp' : 'Low'}</option>
                            <option value="Medium">{appLang === 'vi' ? 'Trung bình' : 'Medium'}</option>
                            <option value="High">{appLang === 'vi' ? 'Cao' : 'High'}</option>
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Chi tiết xen canh' : 'Intercrop Details'}>
                        <input value={farmForm.intercrop_details || ''} onChange={e => setFarmForm({ ...farmForm, intercrop_details: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Bơ, sầu riêng, tiêu...' : 'Avocado, durian, pepper...'} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Độ cao (m)' : 'Elevation (m)'}>
                        <input type="number" value={farmForm.elevation || ''} onChange={e => setFarmForm({ ...farmForm, elevation: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Độ dốc' : 'Slope'}>
                        <select value={farmForm.slope || ''} onChange={e => setFarmForm({ ...farmForm, slope: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="flat">{appLang === 'vi' ? 'Bằng phẳng' : 'Flat'}</option>
                            <option value="gentle">{appLang === 'vi' ? 'Thoải' : 'Gentle'}</option>
                            <option value="moderate">{appLang === 'vi' ? 'Vừa' : 'Moderate'}</option>
                            <option value="steep">{appLang === 'vi' ? 'Dốc' : 'Steep'}</option>
                        </select>
                    </FormField>
                </div>

                {/* LAYER 4 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', margin: '0 0 12px 0' }}>
                        <i className="fas fa-flask" style={{ marginRight: '6px' }}></i>
                        {appLang === 'vi' ? 'Lớp 4: Đất & Phì nhiêu' : 'Layer 4: Soil & Fertility'}
                    </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Loại đất' : 'Soil Type'}>
                        <select value={farmForm.soil_type_plot || ''} onChange={e => setFarmForm({ ...farmForm, soil_type_plot: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Đất đỏ bazan">{appLang === 'vi' ? 'Đất đỏ bazan' : 'Bazalt red soil'}</option>
                            <option value="Đất xám">{appLang === 'vi' ? 'Đất xám' : 'Grey soil'}</option>
                            <option value="Đất thịt">{appLang === 'vi' ? 'Đất thịt' : 'Loam'}</option>
                            <option value="Đất cát">{appLang === 'vi' ? 'Đất cát' : 'Sandy'}</option>
                            <option value="Khác">{appLang === 'vi' ? 'Khác' : 'Other'}</option>
                        </select>
                    </FormField>
                    <FormField label="pH">
                        <input type="number" step="0.1" min="0" max="14" value={farmForm.soil_ph_plot || ''} onChange={e => setFarmForm({ ...farmForm, soil_ph_plot: e.target.value })} style={inputStyle} placeholder="5.5 - 6.5" />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Tỷ lệ hữu cơ (%)' : 'Organic (%)'}>
                        <input type="number" min="0" max="100" value={farmForm.organic_input_pct || ''} onChange={e => setFarmForm({ ...farmForm, organic_input_pct: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Phân bón chính' : 'Main Fertilizers'}>
                        <input value={farmForm.main_fertilizer_types || ''} onChange={e => setFarmForm({ ...farmForm, main_fertilizer_types: e.target.value })} style={inputStyle} placeholder="NPK, Urea, DAP..." />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Tần suất bón' : 'Fertilization Freq'}>
                        <select value={farmForm.fertilization_frequency || ''} onChange={e => setFarmForm({ ...farmForm, fertilization_frequency: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="1 lần/năm">{appLang === 'vi' ? '1 lần/năm' : 'Once/yr'}</option>
                            <option value="2 lần/năm">{appLang === 'vi' ? '2 lần/năm' : '2x/yr'}</option>
                            <option value="3 lần/năm">{appLang === 'vi' ? '3 lần/năm' : '3x/yr'}</option>
                            <option value="Hơn 3 lần/năm">{appLang === 'vi' ? 'Hơn 3 lần/năm' : '4+/yr'}</option>
                        </select>
                    </FormField>
                </div>

                {/* LAYER 5 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', margin: '0 0 12px 0' }}>
                        <i className="fas fa-tint" style={{ marginRight: '6px' }}></i>
                        {appLang === 'vi' ? 'Lớp 5: Nước & Tưới tiêu' : 'Layer 5: Water & Irrigation'}
                    </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Nguồn nước' : 'Water Source'}>
                        <select value={farmForm.water_source_plot || ''} onChange={e => setFarmForm({ ...farmForm, water_source_plot: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Giếng đào">{appLang === 'vi' ? 'Giếng đào' : 'Dug well'}</option>
                            <option value="Giếng khoan">{appLang === 'vi' ? 'Giếng khoan' : 'Borehole'}</option>
                            <option value="Hồ/Suối">{appLang === 'vi' ? 'Hồ/Suối' : 'Pond/Stream'}</option>
                            <option value="Nước mưa">{appLang === 'vi' ? 'Nước mưa' : 'Rainwater'}</option>
                            <option value="Khác">{appLang === 'vi' ? 'Khác' : 'Other'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Phương pháp tưới' : 'Irrigation Method'}>
                        <select value={farmForm.irrigation_method || ''} onChange={e => setFarmForm({ ...farmForm, irrigation_method: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Phun mưa">{appLang === 'vi' ? 'Phun mưa' : 'Sprinkler'}</option>
                            <option value="Nhỏ giọt">{appLang === 'vi' ? 'Nhỏ giọt' : 'Drip'}</option>
                            <option value="Tưới gốc">{appLang === 'vi' ? 'Tưới gốc' : 'Manual'}</option>
                            <option value="Không tưới">{appLang === 'vi' ? 'Không tưới' : 'No irrigation'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Tần suất tưới' : 'Irrigation Freq'}>
                        <select value={farmForm.irrigation_frequency || ''} onChange={e => setFarmForm({ ...farmForm, irrigation_frequency: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Hàng tuần">{appLang === 'vi' ? 'Hàng tuần' : 'Weekly'}</option>
                            <option value="2 tuần/lần">{appLang === 'vi' ? '2 tuần/lần' : '2 weeks'}</option>
                            <option value="Hàng tháng">{appLang === 'vi' ? 'Hàng tháng' : 'Monthly'}</option>
                            <option value="Theo nhu cầu">{appLang === 'vi' ? 'Theo nhu cầu' : 'As needed'}</option>
                        </select>
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Có bể chứa nước' : 'Water Storage'}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={farmForm.water_storage || false} onChange={e => setFarmForm({ ...farmForm, water_storage: e.target.checked })} />
                        <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Có bể/hồ chứa nước' : 'Has water storage tank/pond'}</span>
                    </label>
                </FormField>

                {/* LAYER 6 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', margin: '0 0 12px 0' }}>
                        <i className="fas fa-bug" style={{ marginRight: '6px' }}></i>
                        {appLang === 'vi' ? 'Lớp 6: Bảo vệ cây trồng' : 'Layer 6: Crop Protection'}
                    </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Sâu hại chính' : 'Main Pests'}>
                        <input value={farmForm.main_pests || ''} onChange={e => setFarmForm({ ...farmForm, main_pests: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Loại sâu hại...' : 'Pest types...'} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Bệnh chính' : 'Main Diseases'}>
                        <input value={farmForm.main_diseases || ''} onChange={e => setFarmForm({ ...farmForm, main_diseases: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Loại bệnh...' : 'Disease types...'} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Áp dụng IPM' : 'IPM Practiced'}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={farmForm.ipm_practiced || false} onChange={e => setFarmForm({ ...farmForm, ipm_practiced: e.target.checked })} />
                            <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Có áp dụng IPM' : 'Yes, IPM applied'}</span>
                        </label>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Thuốc được phép' : 'Pesticide Certified'}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={farmForm.pesticide_certified || false} onChange={e => setFarmForm({ ...farmForm, pesticide_certified: e.target.checked })} />
                            <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Chỉ dùng thuốc trong danh mục' : 'Only approved pesticides'}</span>
                        </label>
                    </FormField>
                </div>

                {/* LAYER 7 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', margin: '0 0 12px 0' }}>
                        <i className="fas fa-box" style={{ marginRight: '6px' }}></i>
                        {appLang === 'vi' ? 'Lớp 7: Sản xuất & Năng suất' : 'Layer 7: Production & Yield'}
                    </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Thu hoạch' : 'Harvest Method'}>
                        <select value={farmForm.harvest_method || ''} onChange={e => setFarmForm({ ...farmForm, harvest_method: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Thủ công">{appLang === 'vi' ? 'Thủ công' : 'Manual'}</option>
                            <option value="Cơ giới">{appLang === 'vi' ? 'Cơ giới' : 'Mechanical'}</option>
                            <option value="Kết hợp">{appLang === 'vi' ? 'Kết hợp' : 'Combined'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Chế biến' : 'Processing Method'}>
                        <select value={farmForm.processing_method || ''} onChange={e => setFarmForm({ ...farmForm, processing_method: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Chế biến ướt">{appLang === 'vi' ? 'Chế biến ướt' : 'Wet processing'}</option>
                            <option value="Chế biến khô">{appLang === 'vi' ? 'Chế biến khô' : 'Dry processing'}</option>
                            <option value="Honey">{appLang === 'vi' ? 'Honey' : 'Honey'}</option>
                            <option value="Bán sản phẩm tươi">{appLang === 'vi' ? 'Bán tươi' : 'Sell fresh'}</option>
                        </select>
                    </FormField>
                </div>

                {/* LAYER 8 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', margin: '0 0 12px 0' }}>
                        <i className="fas fa-clipboard-list" style={{ marginRight: '6px' }}></i>
                        {appLang === 'vi' ? 'Lớp 8: Tuân thủ & Truy xuất' : 'Layer 8: Compliance & Traceability'}
                    </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Trạng thái EUDR' : 'EUDR Status'}>
                        <select value={farmForm.eudr_status || ''} onChange={e => setFarmForm({ ...farmForm, eudr_status: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Tuân thủ">{appLang === 'vi' ? 'Tuân thủ' : 'Compliant'}</option>
                            <option value="Không tuân thủ">{appLang === 'vi' ? 'Không tuân thủ' : 'Non-compliant'}</option>
                            <option value="Đang xem xét">{appLang === 'vi' ? 'Đang xem xét' : 'Under review'}</option>
                            <option value="Chưa đánh giá">{appLang === 'vi' ? 'Chưa đánh giá' : 'Not assessed'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Rủi ro phá rừng' : 'Deforestation Risk'}>
                        <select value={farmForm.deforestation_risk || ''} onChange={e => setFarmForm({ ...farmForm, deforestation_risk: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Thấp">{appLang === 'vi' ? 'Thấp' : 'Low'}</option>
                            <option value="Trung bình">{appLang === 'vi' ? 'Trung bình' : 'Medium'}</option>
                            <option value="Cao">{appLang === 'vi' ? 'Cao' : 'High'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Mã truy xuất' : 'Traceability Code'}>
                        <input value={farmForm.traceability_code || ''} onChange={e => setFarmForm({ ...farmForm, traceability_code: e.target.value })} style={inputStyle} placeholder="TCN-XXXX" />
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Bản đồ đã xác minh' : 'Farm Map Verified'}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={farmForm.farm_map_verified || false} onChange={e => setFarmForm({ ...farmForm, farm_map_verified: e.target.checked })} />
                        <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Bản đồ trang trại đã được xác minh' : 'Farm map has been verified'}</span>
                    </label>
                </FormField>
            </ModalOverlay>
        </>
    );

    // ── DIARY TAB with CRUD ──
    const renderDiary = () => (
        <>
            <SectionCard
                title={`${appLang === 'vi' ? 'Nhật ký canh tác' : 'Farm Diary'} (${diary.length})`}
                icon="fa-book"
                action={canEdit ? <AddButton onClick={() => { setDiaryForm(emptyDiary); setEditingItem(null); setShowDiaryForm(true); }} /> : null}
            >
                {diary.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        {appLang === 'vi' ? 'Chưa có nhật ký nào.' : 'No diary entries yet.'}{canEdit ? (appLang === 'vi' ? ' Bấm "Thêm" để bắt đầu ghi chép.' : ' Click "Add" to start.') : ''}
                    </p>
                ) : (
                    diary.map(d => (
                        <div key={d.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--coffee-dark)' }}>
                                    <i className="fas fa-calendar" style={{ marginRight: '6px', color: 'var(--coffee-primary)' }}></i>
                                    {d.diary_date?.split('T')[0] || d.diary_date?.split(' ')[0]}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                        background: '#f0fdf4', color: '#166534'
                                    }}>{ACTIVITY_TYPES.find(a => a.value === d.activity_type)?.[appLang] || d.activity_type}</span>
                                    {canEdit && <button onClick={() => openEditDiary(d)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}>
                                        <i className="fas fa-edit" style={{ fontSize: '12px' }}></i>
                                    </button>}
                                    {canEdit && <button onClick={() => handleDeleteRecord('model_diary', d.id, refreshDiary)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                        <i className="fas fa-trash" style={{ fontSize: '12px' }}></i>
                                    </button>}
                                </div>
                            </div>
                            <p style={{ fontSize: '13px', margin: '6px 0', color: '#475569' }}>{d.description}</p>
                            {d.material_name && (
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {appLang === 'vi' ? 'Vật tư' : 'Material'}: {d.material_name} {d.material_amount && `- ${d.material_amount} ${d.material_unit || ''}`}
                                </div>
                            )}
                            {(d.labor_cost || d.material_cost) && (
                                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                                    {appLang === 'vi' ? 'Chi phí' : 'Cost'}: {formatCompact((d.labor_cost || 0) + (d.material_cost || 0), getDisplayCurrency(), getCachedRates())}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </SectionCard>

            {/* Diary Form Modal */}
            <ModalOverlay
                show={showDiaryForm}
                title={editingItem ? (appLang === 'vi' ? 'Sửa nhật ký' : 'Edit Diary') : (appLang === 'vi' ? 'Thêm nhật ký' : 'Add Diary Entry')}
                onClose={() => { setShowDiaryForm(false); setEditingItem(null); }}
                onSave={handleSaveDiary}
            >
                <FormField label={appLang === 'vi' ? 'Ngày' : 'Date'} required>
                    <input type="date" value={diaryForm.diary_date} onChange={e => setDiaryForm({ ...diaryForm, diary_date: e.target.value })} style={inputStyle} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Loại hoạt động' : 'Activity Type'} required>
                    <select value={diaryForm.activity_type} onChange={e => setDiaryForm({ ...diaryForm, activity_type: e.target.value })} style={selectStyle}>
                        {ACTIVITY_TYPES.map(a => <option key={a.value} value={a.value}>{a[appLang] || a.vi}</option>)}
                    </select>
                </FormField>
                <FormField label={appLang === 'vi' ? 'Mô tả' : 'Description'} required>
                    <textarea value={diaryForm.description} onChange={e => setDiaryForm({ ...diaryForm, description: e.target.value })}
                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder={appLang === 'vi' ? 'Mô tả công việc...' : 'Describe the activity...'} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Vật tư' : 'Material'}>
                        <input value={diaryForm.material_name} onChange={e => setDiaryForm({ ...diaryForm, material_name: e.target.value })} style={inputStyle} placeholder="NPK, DAP..." />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Số lượng' : 'Amount'}>
                        <input type="number" value={diaryForm.material_amount} onChange={e => setDiaryForm({ ...diaryForm, material_amount: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Đơn vị' : 'Unit'}>
                        <input value={diaryForm.material_unit} onChange={e => setDiaryForm({ ...diaryForm, material_unit: e.target.value })} style={inputStyle} placeholder="kg, lít..." />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Giờ công' : 'Labor hrs'}>
                        <input type="number" value={diaryForm.labor_hours} onChange={e => setDiaryForm({ ...diaryForm, labor_hours: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'CP nhân công' : 'Labor cost'}>
                        <input type="number" value={diaryForm.labor_cost} onChange={e => setDiaryForm({ ...diaryForm, labor_cost: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'CP vật tư' : 'Material cost'}>
                        <input type="number" value={diaryForm.material_cost} onChange={e => setDiaryForm({ ...diaryForm, material_cost: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Thời tiết' : 'Weather'}>
                        <input value={diaryForm.weather} onChange={e => setDiaryForm({ ...diaryForm, weather: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Nắng, mưa...' : 'Sunny, rainy...'} />
                    </FormField>
                    <FormField label="GCP">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={diaryForm.gcp_compliant} onChange={e => setDiaryForm({ ...diaryForm, gcp_compliant: e.target.checked })} />
                            <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Tuân thủ GCP' : 'GCP Compliant'}</span>
                        </label>
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Ghi chú' : 'Notes'}>
                    <input value={diaryForm.notes} onChange={e => setDiaryForm({ ...diaryForm, notes: e.target.value })} style={inputStyle} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Ảnh / Tài liệu' : 'Attachments'}>
                    <MediaUpload
                        appLang={appLang}
                        currentUrl={diaryForm.media_preview || ''}
                        onUploadSuccess={(url) => setDiaryForm({ ...diaryForm, media_preview: url })}
                    />
                </FormField>
            </ModalOverlay>
        </>
    );

    // ── INSPECTIONS TAB with CRUD ──
    const renderInspections = () => (
        <>
            <SectionCard
                title={`${appLang === 'vi' ? 'Kiểm tra định kỳ' : 'Inspections'} (${inspections.length})`}
                icon="fa-clipboard-check"
                action={canEdit ? <AddButton onClick={() => { setInspectForm(emptyInspect); setEditingItem(null); setShowInspectForm(true); }} /> : null}
            >
                {inspections.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        {appLang === 'vi' ? 'Chưa có kiểm tra nào.' : 'No inspections yet.'}{canEdit ? (appLang === 'vi' ? ' Bấm "Thêm" để thêm.' : ' Click "Add" to start.') : ''}
                    </p>
                ) : (
                    inspections.map(ins => (
                        <div key={ins.id} style={{ padding: '12px', marginBottom: '10px', background: '#f8fafc', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                                    {ins.inspection_date?.split('T')[0] || ins.inspection_date?.split(' ')[0]}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                        background: ins.inspection_type === 'quarterly' ? '#dbeafe' : ins.inspection_type === 'monthly' ? '#f3e8ff' : '#fef3c7',
                                        color: ins.inspection_type === 'quarterly' ? '#1e40af' : ins.inspection_type === 'monthly' ? '#7c3aed' : '#92400e'
                                    }}>
                                        {INSPECTION_TYPES.find(t => t.value === ins.inspection_type)?.[appLang] || ins.inspection_type}
                                    </span>
                                    {canEdit && <button onClick={() => openEditInspect(ins)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}>
                                        <i className="fas fa-edit" style={{ fontSize: '12px' }}></i>
                                    </button>}
                                    {canEdit && <button onClick={() => handleDeleteRecord('model_inspections', ins.id, refreshInspections)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                        <i className="fas fa-trash" style={{ fontSize: '12px' }}></i>
                                    </button>}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                                <div>{appLang === 'vi' ? 'Sinh trưởng' : 'Growth'}: <b>{QUALITY_OPTIONS.find(q => q.value === ins.growth_quality)?.[appLang] || ins.growth_quality || '-'}</b></div>
                                <div>{appLang === 'vi' ? 'Sâu bệnh' : 'Pests'}: <b>{PEST_OPTIONS.find(q => q.value === ins.pest_status)?.[appLang] || ins.pest_status || '-'}</b></div>
                                <div>{appLang === 'vi' ? 'Đất' : 'Soil'}: <b>{QUALITY_OPTIONS.find(q => q.value === ins.soil_condition)?.[appLang] || ins.soil_condition || '-'}</b></div>
                                <div>{appLang === 'vi' ? 'Nước' : 'Water'}: <b>{WATER_OPTIONS.find(q => q.value === ins.water_status)?.[appLang] || ins.water_status || '-'}</b></div>
                            </div>
                            {ins.recommendations && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                                    {appLang === 'vi' ? 'Khuyến nghị' : 'Recommendations'}: {ins.recommendations}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </SectionCard>

            {/* Inspection Form Modal */}
            <ModalOverlay
                show={showInspectForm}
                title={editingItem ? (appLang === 'vi' ? 'Sửa kiểm tra' : 'Edit Inspection') : (appLang === 'vi' ? 'Thêm kiểm tra' : 'Add Inspection')}
                onClose={() => { setShowInspectForm(false); setEditingItem(null); }}
                onSave={handleSaveInspect}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Ngày kiểm tra' : 'Date'} required>
                        <input type="date" value={inspectForm.inspection_date} onChange={e => setInspectForm({ ...inspectForm, inspection_date: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Loại' : 'Type'} required>
                        <select value={inspectForm.inspection_type} onChange={e => setInspectForm({ ...inspectForm, inspection_type: e.target.value })} style={selectStyle}>
                            {INSPECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t[appLang] || t.vi}</option>)}
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Sinh trưởng' : 'Growth Quality'}>
                        <select value={inspectForm.growth_quality} onChange={e => setInspectForm({ ...inspectForm, growth_quality: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Sâu bệnh' : 'Pest Status'}>
                        <select value={inspectForm.pest_status} onChange={e => setInspectForm({ ...inspectForm, pest_status: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {PEST_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Tình trạng đất' : 'Soil Condition'}>
                        <select value={inspectForm.soil_condition} onChange={e => setInspectForm({ ...inspectForm, soil_condition: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Tình trạng nước' : 'Water Status'}>
                        <select value={inspectForm.water_status} onChange={e => setInspectForm({ ...inspectForm, water_status: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {WATER_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Chất lượng quả' : 'Fruit Quality'}>
                        <select value={inspectForm.fruit_quality} onChange={e => setInspectForm({ ...inspectForm, fruit_quality: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Sức khỏe cây (%)' : 'Tree Health %'}>
                        <input type="number" min="0" max="100" value={inspectForm.tree_health_pct} onChange={e => setInspectForm({ ...inspectForm, tree_health_pct: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                {inspectForm.pest_status && inspectForm.pest_status !== 'none' && (
                    <FormField label={appLang === 'vi' ? 'Chi tiết sâu bệnh' : 'Pest Details'}>
                        <input value={inspectForm.pest_details} onChange={e => setInspectForm({ ...inspectForm, pest_details: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Loại sâu, mức độ...' : 'Pest type, severity...'} />
                    </FormField>
                )}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', marginBottom: '12px' }}>
                        <i className='fas fa-flask' style={{ marginRight: '6px' }}></i>{appLang === 'vi' ? 'Lớp 4: Kiểm tra đất & nước' : 'Layer 4: Soil & Water Check'}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FormField label={appLang === 'vi' ? 'pH đất mẫu' : 'Soil pH Sample'}>
                            <input type='number' step='0.1' value={inspectForm.soil_ph_sample} onChange={e => setInspectForm({ ...inspectForm, soil_ph_sample: e.target.value })} style={inputStyle} placeholder='5.5 - 6.5' />
                        </FormField>
                        <FormField label={appLang === 'vi' ? 'Tình trạng tưới' : 'Irrigation Adequacy'}>
                            <select value={inspectForm.irrigation_adequacy} onChange={e => setInspectForm({ ...inspectForm, irrigation_adequacy: e.target.value })} style={selectStyle}>
                                <option value=''>--</option>
                                <option value='Đủ nước'>{appLang === 'vi' ? 'Đủ nước' : 'Adequate'}</option>
                                <option value='Thiếu nước'>{appLang === 'vi' ? 'Thiếu nước' : 'Inadequate'}</option>
                                <option value='Dư nước'>{appLang === 'vi' ? 'Dư nước' : 'Excess'}</option>
                            </select>
                        </FormField>
                    </div>
                </div>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', marginBottom: '12px' }}>
                        <i className='fas fa-shield-alt' style={{ marginRight: '6px' }}></i>{appLang === 'vi' ? 'Lớp 8: Tuân thủ EUDR' : 'Layer 8: EUDR Compliance'}
                    </h4>
                    <FormField label={appLang === 'vi' ? 'Kiểm tra EUDR đạt' : 'EUDR Check Passed'}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                            <input type='checkbox' checked={inspectForm.eudr_check_passed || false} onChange={e => setInspectForm({ ...inspectForm, eudr_check_passed: e.target.checked })} />
                            <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Đạt yêu cầu' : 'Passed'}</span>
                        </label>
                    </FormField>
                </div>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed #f1f5f9' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', marginBottom: '12px' }}>
                        <i className='fas fa-female' style={{ marginRight: '6px' }}></i>{appLang === 'vi' ? 'Lớp 9: Lao động nữ' : 'Layer 9: Women Labour'}
                    </h4>
                    <FormField label={appLang === 'vi' ? 'Tỷ lệ lao động nữ (%)' : 'Female Participation (%)'}>
                        <input type='number' min='0' max='100' value={inspectForm.female_participation_pct} onChange={e => setInspectForm({ ...inspectForm, female_participation_pct: e.target.value })} style={inputStyle} placeholder='0 - 100' />
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Khuyến nghị' : 'Recommendations'}>
                    <textarea value={inspectForm.recommendations} onChange={e => setInspectForm({ ...inspectForm, recommendations: e.target.value })}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder={appLang === 'vi' ? 'Đề xuất hành động...' : 'Suggested actions...'} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Hành động tiếp theo' : 'Follow-up Actions'}>
                    <input value={inspectForm.follow_up_actions} onChange={e => setInspectForm({ ...inspectForm, follow_up_actions: e.target.value })} style={inputStyle} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Ghi chú' : 'Notes'}>
                    <input value={inspectForm.notes} onChange={e => setInspectForm({ ...inspectForm, notes: e.target.value })} style={inputStyle} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Ảnh / Tài liệu' : 'Attachments'}>
                    <MediaUpload
                        appLang={appLang}
                        currentUrl={inspectForm.media_preview || ''}
                        onUploadSuccess={(url) => setInspectForm({ ...inspectForm, media_preview: url })}
                    />
                </FormField>
            </ModalOverlay>
        </>
    );

    // ── CONSUMABLES TAB with CRUD ──
    const renderConsumables = () => {
        const totalCost = consumables.reduce((s, c) => s + (c.total_cost || 0), 0);
        const byCat = {};
        consumables.forEach(c => {
            byCat[c.category] = (byCat[c.category] || 0) + (c.total_cost || 0);
        });

        return (
            <>
                <div style={{
                    background: 'linear-gradient(135deg, #92400e, #d97706)', borderRadius: '16px',
                    padding: '20px', color: 'white', textAlign: 'center', marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>{appLang === 'vi' ? 'Tổng tiêu hao' : 'Total Costs'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{formatCompact(totalCost, getDisplayCurrency(), getCachedRates())}</div>
                </div>

                {Object.keys(byCat).length > 0 && (
                    <SectionCard title={appLang === 'vi' ? 'Theo danh mục' : 'By Category'} icon="fa-layer-group">
                        {Object.entries(byCat).map(([cat, total]) => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                                    {CONSUMABLE_CATEGORIES.find(c => c.value === cat)?.[appLang] || cat}
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--coffee-dark)' }}>{formatCompact(total, getDisplayCurrency(), getCachedRates())}</span>
                            </div>
                        ))}
                    </SectionCard>
                )}

                <SectionCard
                    title={`${appLang === 'vi' ? 'Chi tiết' : 'Details'} (${consumables.length})`}
                    icon="fa-receipt"
                    action={canEdit ? <AddButton onClick={() => { setConsumForm(emptyConsum); setEditingItem(null); setShowConsumForm(true); }} /> : null}
                >
                    {consumables.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                            {appLang === 'vi' ? 'Chưa có dữ liệu.' : 'No data yet.'}{canEdit ? (appLang === 'vi' ? ' Bấm "Thêm" để thêm.' : ' Click "Add" to start.') : ''}
                        </p>
                    ) : (
                        consumables.map(c => (
                            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{c.item_name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatCompact(c.total_cost || 0, getDisplayCurrency(), getCachedRates())}</span>
                                        {canEdit && <button onClick={() => openEditConsum(c)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}>
                                            <i className="fas fa-edit" style={{ fontSize: '11px' }}></i>
                                        </button>}
                                        {canEdit && <button onClick={() => handleDeleteRecord('model_consumables', c.id, refreshConsumables)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                            <i className="fas fa-trash" style={{ fontSize: '11px' }}></i>
                                        </button>}
                                    </div>
                                </div>
                                <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                                    {c.record_date?.split('T')[0] || c.record_date?.split(' ')[0]} | {CONSUMABLE_CATEGORIES.find(cat => cat.value === c.category)?.[appLang] || c.category} {c.quantity ? `| ${c.quantity} ${c.unit || ''}` : ''}
                                </div>
                            </div>
                        ))
                    )}
                </SectionCard>

                {/* Consumable Form Modal */}
                <ModalOverlay
                    show={showConsumForm}
                    title={editingItem ? (appLang === 'vi' ? 'Sửa tiêu hao' : 'Edit Cost') : (appLang === 'vi' ? 'Thêm tiêu hao' : 'Add Cost')}
                    onClose={() => { setShowConsumForm(false); setEditingItem(null); }}
                    onSave={handleSaveConsum}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FormField label={appLang === 'vi' ? 'Ngày' : 'Date'} required>
                            <input type="date" value={consumForm.record_date} onChange={e => setConsumForm({ ...consumForm, record_date: e.target.value })} style={inputStyle} />
                        </FormField>
                        <FormField label={appLang === 'vi' ? 'Danh mục' : 'Category'} required>
                            <select value={consumForm.category} onChange={e => setConsumForm({ ...consumForm, category: e.target.value })} style={selectStyle}>
                                {CONSUMABLE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c[appLang] || c.vi}</option>)}
                            </select>
                        </FormField>
                    </div>
                    <FormField label={appLang === 'vi' ? 'Tên hạng mục' : 'Item Name'} required>
                        <input value={consumForm.item_name} onChange={e => setConsumForm({ ...consumForm, item_name: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'VD: NPK 16-16-8' : 'e.g. NPK 16-16-8'} />
                    </FormField>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <FormField label={appLang === 'vi' ? 'Số lượng' : 'Quantity'}>
                            <input type="number" value={consumForm.quantity} onChange={e => setConsumForm({ ...consumForm, quantity: e.target.value })} style={inputStyle} />
                        </FormField>
                        <FormField label={appLang === 'vi' ? 'Đơn vị' : 'Unit'}>
                            <input value={consumForm.unit} onChange={e => setConsumForm({ ...consumForm, unit: e.target.value })} style={inputStyle} placeholder="kg, lit..." />
                        </FormField>
                        <FormField label={appLang === 'vi' ? 'Đơn giá' : 'Unit Price'}>
                            <input type="number" value={consumForm.unit_price} onChange={e => setConsumForm({ ...consumForm, unit_price: e.target.value })} style={inputStyle} />
                        </FormField>
                    </div>
                    <FormField label={appLang === 'vi' ? 'Tổng chi phí (VND)' : 'Total Cost (VND)'}>
                        <input type="number" value={consumForm.total_cost} onChange={e => setConsumForm({ ...consumForm, total_cost: e.target.value })} style={inputStyle}
                            placeholder={consumForm.quantity && consumForm.unit_price ? `Tự tính: ${Number(consumForm.quantity) * Number(consumForm.unit_price)}` : ''} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Ghi chú' : 'Notes'}>
                        <input value={consumForm.notes} onChange={e => setConsumForm({ ...consumForm, notes: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Ảnh / Tài liệu' : 'Attachments'}>
                        <MediaUpload
                            appLang={appLang}
                            currentUrl={consumForm.media_preview || ''}
                            onUploadSuccess={(url) => setConsumForm({ ...consumForm, media_preview: url })}
                        />
                    </FormField>
                </ModalOverlay>
            </>
        );
    };

    const renderInvest = () => {
        const diaryCost = diary.reduce((s, d) => s + (d.labor_cost || 0) + (d.material_cost || 0), 0);
        const consumCost = consumables.reduce((s, c) => s + (c.total_cost || 0), 0);
        const totalInvest = diaryCost + consumCost;

        return (
            <>
                <div style={{
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)', borderRadius: '16px',
                    padding: '20px', color: 'white', textAlign: 'center', marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>{appLang === 'vi' ? 'Tổng đầu tư mô hình' : 'Total Model Investment'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{formatCompact(totalInvest, getDisplayCurrency(), getCachedRates())}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#166534' }}>{appLang === 'vi' ? 'Từ nhật ký' : 'From Diary'}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534' }}>{formatCompact(diaryCost, getDisplayCurrency(), getCachedRates())}</div>
                    </div>
                    <div style={{ background: '#fef9c3', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#854d0e' }}>{appLang === 'vi' ? 'Từ tiêu hao' : 'From Consumables'}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#854d0e' }}>{formatCompact(consumCost, getDisplayCurrency(), getCachedRates())}</div>
                    </div>
                </div>

                {income && (
                    <SectionCard title={appLang === 'vi' ? 'So sánh thu nhập nông hộ' : 'Farmer Income Comparison'} icon="fa-balance-scale">
                        <InfoRow label={appLang === 'vi' ? 'Thu nhập ròng hộ' : 'Net household income'} value={income.total_income ? `${income.total_income} tr.đ` : null} icon="fa-wallet" />
                        <InfoRow label={appLang === 'vi' ? 'Đầu tư mô hình' : 'Model investment'} value={`${(totalInvest / 1000000).toFixed(1)} tr.đ`} icon="fa-piggy-bank" />
                        <InfoRow label={appLang === 'vi' ? 'Doanh thu cà phê' : 'Coffee revenue'} value={income.coffee_revenue ? `${income.coffee_revenue} tr.đ` : null} icon="fa-mug-hot" />
                    </SectionCard>
                )}

                <button
                    onClick={() => setShowReport(true)}
                    style={{
                        width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white',
                        fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 12px rgba(220,38,38,0.3)', marginTop: '8px'
                    }}
                >
                    <i className="fas fa-file-pdf"></i>
                    {appLang === 'vi' ? 'Xuất báo cáo PDF' : 'Export PDF Report'}
                </button>
            </>
        );
    };

    const tabContent = {
        overview: renderOverview,
        farmer: renderFarmer,
        farm: renderFarm,
        diary: renderDiary,
        inspect: renderInspections,
        consumable: renderConsumables,
        invest: renderInvest,
        economics: () => <ModelEconomics model={model} appLang={appLang} canEdit={canEdit} />
    };

    return (
        <div className="view-container animate-in">
            {/* Header */}
            <div className="mdv-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div className="mdv-header-title-container" style={{ flex: 1 }}>
                    <h2 className="mdv-title" style={{ margin: 0, fontSize: '18px', color: 'var(--coffee-dark)' }}>
                        <span style={{ color: 'var(--coffee-primary)', fontWeight: 800 }}>{model.model_code}</span> - {model.name || model.model_name}
                    </h2>
                </div>
                <button
                    className="mdv-pdf-btn"
                    onClick={() => setShowReport(true)}
                    style={{
                        padding: '8px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white',
                        fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
                        boxShadow: '0 2px 8px rgba(220,38,38,0.3)', whiteSpace: 'nowrap'
                    }}
                >
                    <i className="fas fa-file-pdf"></i>
                    PDF
                </button>
                {!canEdit && (
                    <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        background: '#fef3c7', color: '#92400e', whiteSpace: 'nowrap'
                    }}>
                        <i className="fas fa-eye" style={{ marginRight: '4px' }}></i>
                        {appLang === 'vi' ? 'Chỉ xem' : 'View only'}
                    </span>
                )}
            </div>

            {/* Tab Bar */}
            <div className="mdv-tab-bar" style={{
                display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '20px',
                padding: '4px', background: '#f1f5f9', borderRadius: '14px',
                WebkitOverflowScrolling: 'touch'
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className="mdv-tab-btn"
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 'none', padding: '8px 14px', border: 'none', borderRadius: '10px',
                            background: activeTab === tab.id ? 'white' : 'transparent',
                            color: activeTab === tab.id ? 'var(--coffee-dark)' : '#64748b',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className={`fas ${tab.icon}`} style={{ marginRight: '5px' }}></i>
                        <span className="mdv-tab-label">{tab[appLang] || tab.vi}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--coffee-primary)' }}></i>
                </div>
            ) : (
                tabContent[activeTab]?.()
            )}

            <ModelReport
                show={showReport}
                onClose={() => setShowReport(false)}
                model={model}
                farmer={farmer}
                diary={diary}
                inspections={inspections}
                consumables={consumables}
                appLang={appLang}
            />
        </div>
    );
};

export default ModelDetailView;
