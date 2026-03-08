import React, { useState, useEffect, useCallback } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import ModelReport from './ModelReport';
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
    { id: 'invest', icon: 'fa-chart-pie', vi: 'Đầu tư', en: 'Invest', ede: 'Mnga' }
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
    const emptyInspect = { inspection_date: today(), inspection_type: 'quarterly', growth_quality: '', pest_status: '', pest_details: '', soil_condition: '', water_status: '', tree_health_pct: '', fruit_quality: '', recommendations: '', follow_up_actions: '', notes: '' };
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
            if (model.farm_id) {
                const fm = await pb.collection('farm_baselines').getOne(model.farm_id).catch(() => null);
                setFarm(fm);
            }
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
                diary_date: diaryForm.diary_date + ' 12:00:00',
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
                inspection_date: inspectForm.inspection_date + ' 12:00:00',
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
                record_date: consumForm.record_date + ' 12:00:00',
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
                farm_name: farmForm.farm_name || null,
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
            };
            await pb.collection('farm_baselines').update(farm.id, data);
            const updated = await pb.collection('farm_baselines').getOne(farm.id);
            setFarm(updated);
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
        });
        setShowFarmerForm(true);
    };

    const openEditFarm = () => {
        setFarmForm({
            farm_name: farm?.farm_name || '',
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
            notes: farm?.notes || '',
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
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
            {farm ? (
                <SectionCard title={appLang === 'vi' ? 'Trang trại tham gia mô hình' : 'Farm in Model'} icon="fa-map-marked-alt"
                    action={canEdit ? <AddButton onClick={openEditFarm} label={appLang === 'vi' ? 'Sửa' : 'Edit'} /> : null}>
                    <InfoRow label={appLang === 'vi' ? 'Tên' : 'Name'} value={farm.farm_name} icon="fa-tag" />
                    <InfoRow label={appLang === 'vi' ? 'Tổng DT' : 'Total area'} value={farm.total_area ? `${farm.total_area} ha` : null} icon="fa-ruler" />
                    <InfoRow label={appLang === 'vi' ? 'DT cà phê' : 'Coffee area'} value={farm.coffee_area ? `${farm.coffee_area} ha` : null} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'DT xen canh' : 'Intercrop area'} value={farm.intercrop_area ? `${farm.intercrop_area} ha` : null} icon="fa-tree" />
                    <InfoRow label={appLang === 'vi' ? 'Cây xen' : 'Intercrop'} value={farm.intercrop_details} icon="fa-seedling" />
                    <InfoRow label="pH" value={farm.soil_ph} icon="fa-flask" />
                    <InfoRow label={appLang === 'vi' ? 'Loại đất' : 'Soil type'} value={farm.soil_type} icon="fa-mountain" />
                    <InfoRow label={appLang === 'vi' ? 'Độ dốc' : 'Slope'} value={farm.slope} icon="fa-signal" />
                    <InfoRow label={appLang === 'vi' ? 'Nguồn nước' : 'Water source'} value={farm.water_source} icon="fa-tint" />
                    <InfoRow label={appLang === 'vi' ? 'Tưới tiêu' : 'Irrigation'} value={farm.irrigation_system} icon="fa-shower" />
                    <InfoRow label={appLang === 'vi' ? 'Độ cao' : 'Elevation'} value={farm.elevation ? `${farm.elevation}m` : null} icon="fa-arrow-up" />
                    <InfoRow label="GPS" value={farm.gps_lat && farm.gps_long ? `${farm.gps_lat}, ${farm.gps_long}` : null} icon="fa-map-pin" />
                    <InfoRow label={appLang === 'vi' ? 'Cỏ phủ' : 'Grass cover'} value={farm.grass_cover} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'Cây bóng mát' : 'Shade trees'} value={farm.shade_trees} icon="fa-tree" />
                </SectionCard>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-map" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                    <p>{appLang === 'vi' ? 'Chưa gán trang trại' : 'No farm assigned yet'}</p>
                </div>
            )}

            {plots.length > 0 && (
                <SectionCard title={`${appLang === 'vi' ? 'Các mảnh đất của hộ' : 'Land Plots'} (${plots.length})`} icon="fa-th-large">
                    {plots.map(p => (
                        <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--coffee-dark)' }}>{p.plot_name || (appLang === 'vi' ? 'Mảnh đất' : 'Plot')}</div>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                <span>{p.area_ha} ha</span>
                                {p.tree_count && <span>{p.tree_count} {appLang === 'vi' ? 'gốc' : 'trees'}</span>}
                                {p.yield_current && <span>{appLang === 'vi' ? 'SL' : 'Yield'}: {p.yield_current}</span>}
                                {p.intercrop && <span>{appLang === 'vi' ? 'Xen canh' : 'Intercrop'}: {p.intercrop_species}</span>}
                            </div>
                        </div>
                    ))}
                </SectionCard>
            )}

            {/* Farm Edit Modal */}
            <ModalOverlay
                show={showFarmForm}
                title={appLang === 'vi' ? 'Cập nhật thông tin trang trại' : 'Update Farm Info'}
                onClose={() => setShowFarmForm(false)}
                onSave={handleSaveFarm}
            >
                <FormField label={appLang === 'vi' ? 'Tên trang trại' : 'Farm Name'}>
                    <input value={farmForm.farm_name || ''} onChange={e => setFarmForm({ ...farmForm, farm_name: e.target.value })} style={inputStyle} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Tổng DT (ha)' : 'Total Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.total_area || ''} onChange={e => setFarmForm({ ...farmForm, total_area: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'DT cà phê (ha)' : 'Coffee Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.coffee_area || ''} onChange={e => setFarmForm({ ...farmForm, coffee_area: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'DT xen canh (ha)' : 'Intercrop Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.intercrop_area || ''} onChange={e => setFarmForm({ ...farmForm, intercrop_area: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Chi tiết xen canh' : 'Intercrop Details'}>
                    <input value={farmForm.intercrop_details || ''} onChange={e => setFarmForm({ ...farmForm, intercrop_details: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Bơ, sầu riêng, tiêu...' : 'Avocado, durian, pepper...'} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Loại đất' : 'Soil Type'}>
                        <input value={farmForm.soil_type || ''} onChange={e => setFarmForm({ ...farmForm, soil_type: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Bazan, phù sa...' : 'Basalt, alluvial...'} />
                    </FormField>
                    <FormField label="pH">
                        <input type="number" step="0.1" value={farmForm.soil_ph || ''} onChange={e => setFarmForm({ ...farmForm, soil_ph: e.target.value })} style={inputStyle} />
                    </FormField>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Nguồn nước' : 'Water Source'}>
                        <input value={farmForm.water_source || ''} onChange={e => setFarmForm({ ...farmForm, water_source: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Giếng, suối, hồ...' : 'Well, stream, pond...'} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Hệ thống tưới' : 'Irrigation'}>
                        <input value={farmForm.irrigation_system || ''} onChange={e => setFarmForm({ ...farmForm, irrigation_system: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Nhỏ giọt, phun mưa...' : 'Drip, sprinkler...'} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Độ cao (m)' : 'Elevation (m)'}>
                        <input type="number" value={farmForm.elevation || ''} onChange={e => setFarmForm({ ...farmForm, elevation: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label="GPS Lat">
                        <input type="number" step="0.0001" value={farmForm.gps_lat || ''} onChange={e => setFarmForm({ ...farmForm, gps_lat: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label="GPS Long">
                        <input type="number" step="0.0001" value={farmForm.gps_long || ''} onChange={e => setFarmForm({ ...farmForm, gps_long: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Cỏ phủ' : 'Grass Cover'}>
                        <select value={farmForm.grass_cover || ''} onChange={e => setFarmForm({ ...farmForm, grass_cover: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Low">{appLang === 'vi' ? 'Thấp' : 'Low'}</option>
                            <option value="Medium">{appLang === 'vi' ? 'Trung bình' : 'Medium'}</option>
                            <option value="High">{appLang === 'vi' ? 'Cao' : 'High'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Số cây bóng mát' : 'Shade Trees'}>
                        <input type="number" value={farmForm.shade_trees || ''} onChange={e => setFarmForm({ ...farmForm, shade_trees: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Ghi chú' : 'Notes'}>
                    <textarea value={farmForm.notes || ''} onChange={e => setFarmForm({ ...farmForm, notes: e.target.value })}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
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
        invest: renderInvest
    };

    return (
        <div className="view-container animate-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--coffee-dark)' }}>
                        <span style={{ color: 'var(--coffee-primary)', fontWeight: 800 }}>{model.model_code}</span> - {model.name || model.model_name}
                    </h2>
                </div>
                <button
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
            <div style={{
                display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '20px',
                padding: '4px', background: '#f1f5f9', borderRadius: '14px',
                WebkitOverflowScrolling: 'touch'
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
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
                        {tab[appLang] || tab.vi}
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
