import React, { useState, useEffect, useCallback } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import './Dashboard.css';

const TABS = [
    { id: 'overview', icon: 'fa-info-circle', vi: 'Tong quan', en: 'Overview', ede: 'Klei dlieh' },
    { id: 'farmer', icon: 'fa-user', vi: 'Nong ho', en: 'Farmer', ede: 'Mnuih' },
    { id: 'farm', icon: 'fa-map', vi: 'Trang trai', en: 'Farm', ede: 'Hma' },
    { id: 'diary', icon: 'fa-book', vi: 'Nhat ky', en: 'Diary', ede: 'Hdro' },
    { id: 'inspect', icon: 'fa-clipboard-check', vi: 'Kiem tra', en: 'Inspect', ede: 'Dlang' },
    { id: 'consumable', icon: 'fa-receipt', vi: 'Tieu hao', en: 'Costs', ede: 'Prak' },
    { id: 'invest', icon: 'fa-chart-pie', vi: 'Dau tu', en: 'Invest', ede: 'Mnga' }
];

const ACTIVITY_TYPES = [
    { value: 'fertilize', vi: 'Bon phan', en: 'Fertilize' },
    { value: 'pesticide', vi: 'Phun thuoc', en: 'Pesticide' },
    { value: 'irrigate', vi: 'Tuoi nuoc', en: 'Irrigate' },
    { value: 'prune', vi: 'Tia canh', en: 'Prune' },
    { value: 'weed', vi: 'Lam co', en: 'Weed' },
    { value: 'harvest', vi: 'Thu hoach', en: 'Harvest' },
    { value: 'tree_care', vi: 'Cham cay', en: 'Tree Care' },
    { value: 'other', vi: 'Khac', en: 'Other' },
];

const INSPECTION_TYPES = [
    { value: 'quarterly', vi: 'Hang quy', en: 'Quarterly' },
    { value: 'monthly', vi: 'Hang thang', en: 'Monthly' },
    { value: 'adhoc', vi: 'Dot xuat', en: 'Ad-hoc' },
];

const QUALITY_OPTIONS = [
    { value: 'poor', vi: 'Kem', en: 'Poor' },
    { value: 'fair', vi: 'TB', en: 'Fair' },
    { value: 'good', vi: 'Tot', en: 'Good' },
    { value: 'excellent', vi: 'Rat tot', en: 'Excellent' },
];

const WATER_OPTIONS = [
    { value: 'drought', vi: 'Han', en: 'Drought' },
    { value: 'adequate', vi: 'Du', en: 'Adequate' },
    { value: 'excess', vi: 'Thua', en: 'Excess' },
];

const PEST_OPTIONS = [
    { value: 'none', vi: 'Khong', en: 'None' },
    { value: 'minor', vi: 'Nhe', en: 'Minor' },
    { value: 'moderate', vi: 'TB', en: 'Moderate' },
    { value: 'severe', vi: 'Nang', en: 'Severe' },
];

const CONSUMABLE_CATEGORIES = [
    { value: 'fertilizer', vi: 'Phan bon', en: 'Fertilizer' },
    { value: 'pesticide', vi: 'Thuoc BVTV', en: 'Pesticide' },
    { value: 'labor', vi: 'Nhan cong', en: 'Labor' },
    { value: 'fuel', vi: 'Nhien lieu', en: 'Fuel' },
    { value: 'electricity', vi: 'Dien', en: 'Electricity' },
    { value: 'water', vi: 'Nuoc', en: 'Water' },
    { value: 'other', vi: 'Khac', en: 'Other' },
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
        if (!diaryForm.description.trim()) return alert(appLang === 'vi' ? 'Vui long nhap mo ta' : 'Please enter description');
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
        if (!consumForm.item_name.trim()) return alert(appLang === 'vi' ? 'Vui long nhap ten hang muc' : 'Please enter item name');
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
        if (!confirm(appLang === 'vi' ? 'Ban co chac muon xoa?' : 'Are you sure you want to delete?')) return;
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
            <i className="fas fa-plus"></i> {label || (appLang === 'vi' ? 'Them' : 'Add')}
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
                        }}>{appLang === 'vi' ? 'Huy' : 'Cancel'}</button>
                        <button onClick={onSave} disabled={saving} style={{
                            flex: 1, padding: '12px', border: 'none', borderRadius: '12px',
                            background: 'var(--coffee-primary)', color: 'white', fontSize: '14px', fontWeight: 700,
                            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1
                        }}>
                            {saving ? <i className="fas fa-spinner fa-spin"></i> : (editingItem ? (appLang === 'vi' ? 'Cap nhat' : 'Update') : (appLang === 'vi' ? 'Luu' : 'Save'))}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ===== TAB CONTENT =====

    const renderOverview = () => (
        <>
            <SectionCard title={appLang === 'vi' ? 'Thong tin mo hinh' : 'Model Info'} icon="fa-seedling">
                <InfoRow label="Ma mo hinh" value={model.model_code} icon="fa-hashtag" />
                <InfoRow label="Ten" value={model.name || model.model_name} icon="fa-tag" />
                <InfoRow label="Mo ta" value={model.description} icon="fa-align-left" />
                <InfoRow label="Vi tri" value={model.location || (model.commune && model.village ? `${model.village}, ${model.commune}` : model.commune)} icon="fa-map-marker-alt" />
                <InfoRow label="Tinh" value={model.province || 'Gia Lai'} icon="fa-globe" />
                <InfoRow label="Dien tich" value={(model.area || model.target_area) ? `${model.area || model.target_area} ha` : null} icon="fa-ruler-combined" />
                <InfoRow label="Loai ca phe" value={model.coffee_type} icon="fa-mug-hot" />
                <InfoRow label="Trang thai" value={model.status?.toUpperCase()} icon="fa-flag" />
                <InfoRow label="Du lieu" value={model.data_status} icon="fa-database" />
            </SectionCard>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    { label: appLang === 'vi' ? 'Nhat ky' : 'Diary', count: diary.length, color: '#166534', bg: '#dcfce7', icon: 'fa-book' },
                    { label: appLang === 'vi' ? 'Kiem tra' : 'Inspections', count: inspections.length, color: '#1e40af', bg: '#dbeafe', icon: 'fa-clipboard-check' },
                    { label: appLang === 'vi' ? 'Tieu hao' : 'Costs', count: consumables.length, color: '#854d0e', bg: '#fef9c3', icon: 'fa-receipt' }
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
                    <SectionCard title={appLang === 'vi' ? 'Chu ho mo hinh' : 'Model Owner'} icon="fa-user"
                        action={canEdit ? <AddButton onClick={openEditFarmer} label={appLang === 'vi' ? 'Sua' : 'Edit'} /> : null}>
                        <InfoRow label={appLang === 'vi' ? 'Ho ten' : 'Full name'} value={farmer.full_name} icon="fa-user" />
                        <InfoRow label={appLang === 'vi' ? 'Ma' : 'Code'} value={farmer.farmer_code} icon="fa-id-badge" />
                        <InfoRow label={appLang === 'vi' ? 'Gioi tinh' : 'Gender'} value={farmer.gender} icon="fa-venus-mars" />
                        <InfoRow label={appLang === 'vi' ? 'Dan toc' : 'Ethnicity'} value={farmer.ethnicity} icon="fa-users" />
                        <InfoRow label={appLang === 'vi' ? 'SDT' : 'Phone'} value={farmer.phone} icon="fa-phone" />
                        <InfoRow label={appLang === 'vi' ? 'CMND/CCCD' : 'ID Card'} value={farmer.id_card} icon="fa-id-card" />
                        <InfoRow label={appLang === 'vi' ? 'Thon' : 'Village'} value={farmer.village} icon="fa-home" />
                        <InfoRow label={appLang === 'vi' ? 'Xa' : 'Commune'} value={farmer.commune} icon="fa-map" />
                        <InfoRow label={appLang === 'vi' ? 'Huyen' : 'District'} value={farmer.district} icon="fa-map-signs" />
                        <InfoRow label={appLang === 'vi' ? 'Tinh' : 'Province'} value={farmer.province} icon="fa-globe" />
                        <InfoRow label={appLang === 'vi' ? 'Kinh te ho' : 'Economic class'} value={farmer.economic_class} icon="fa-chart-bar" />
                        <InfoRow label={appLang === 'vi' ? 'Nam trong ca phe' : 'Coffee experience'} value={farmer.coffee_years ? `${farmer.coffee_years} ${appLang === 'vi' ? 'nam' : 'years'}` : null} icon="fa-coffee" />
                        <InfoRow label={appLang === 'vi' ? 'Hoc van' : 'Education'} value={farmer.education} icon="fa-graduation-cap" />
                        <InfoRow label={appLang === 'vi' ? 'Thanh vien HTX' : 'Coop member'} value={farmer.cooperative_member ? (appLang === 'vi' ? 'Co' : 'Yes') : (appLang === 'vi' ? 'Khong' : 'No')} icon="fa-handshake" />
                        <InfoRow label={appLang === 'vi' ? 'So thanh vien ho' : 'Household size'} value={farmer.household_members} icon="fa-people-arrows" />
                    </SectionCard>

                    {members.length > 0 && (
                        <SectionCard title={`${appLang === 'vi' ? 'Thanh vien ho' : 'Household'} (${members.length})`} icon="fa-people-arrows">
                            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>{appLang === 'vi' ? 'Ten' : 'Name'}</th>
                                        <th style={{ padding: '8px' }}>{appLang === 'vi' ? 'GT' : 'Gender'}</th>
                                        <th style={{ padding: '8px' }}>{appLang === 'vi' ? 'Nam sinh' : 'Birth'}</th>
                                        <th style={{ padding: '8px' }}>{appLang === 'vi' ? 'Quan he' : 'Relation'}</th>
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
                        <SectionCard title={`${appLang === 'vi' ? 'Thu nhap nam' : 'Income'} ${income.year || 2025}`} icon="fa-coins">
                            <InfoRow label={appLang === 'vi' ? 'Tong thu nhap rong' : 'Net income'} value={income.total_income ? `${income.total_income} tr.d` : null} icon="fa-wallet" />
                            <InfoRow label={appLang === 'vi' ? 'Tu ca phe (rong)' : 'Coffee net'} value={income.coffee_net ? `${income.coffee_net} tr.d` : null} icon="fa-mug-hot" />
                            <InfoRow label={appLang === 'vi' ? 'Doanh thu ca phe' : 'Coffee revenue'} value={income.coffee_revenue ? `${income.coffee_revenue} tr.d` : null} icon="fa-arrow-up" />
                            <InfoRow label={appLang === 'vi' ? 'Chi phi ca phe' : 'Coffee cost'} value={income.coffee_cost ? `${income.coffee_cost} tr.d` : null} icon="fa-arrow-down" />
                            <InfoRow label={appLang === 'vi' ? 'San luong' : 'Production'} value={income.production_tons ? `${income.production_tons} ${appLang === 'vi' ? 'tan' : 'tons'}` : null} icon="fa-box" />
                            <InfoRow label={appLang === 'vi' ? 'Ty trong NN' : 'Agri ratio'} value={income.agri_income_ratio ? `${(income.agri_income_ratio * 100).toFixed(0)}%` : null} icon="fa-percent" />
                        </SectionCard>
                    )}
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-user-slash" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                    <p>{appLang === 'vi' ? 'Chua gan nong ho cho mo hinh nay' : 'No farmer assigned yet'}</p>
                </div>
            )}

            {/* Farmer Edit Modal */}
            <ModalOverlay
                show={showFarmerForm}
                title={appLang === 'vi' ? 'Cap nhat thong tin nong ho' : 'Update Farmer Info'}
                onClose={() => setShowFarmerForm(false)}
                onSave={handleSaveFarmer}
            >
                <FormField label={appLang === 'vi' ? 'Ho ten' : 'Full Name'} required>
                    <input value={farmerForm.full_name || ''} onChange={e => setFarmerForm({ ...farmerForm, full_name: e.target.value })} style={inputStyle} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Gioi tinh' : 'Gender'}>
                        <select value={farmerForm.gender || ''} onChange={e => setFarmerForm({ ...farmerForm, gender: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Nam">{appLang === 'vi' ? 'Nam' : 'Male'}</option>
                            <option value="Nu">{appLang === 'vi' ? 'Nu' : 'Female'}</option>
                            <option value="Khac">{appLang === 'vi' ? 'Khac' : 'Other'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Dan toc' : 'Ethnicity'}>
                        <input value={farmerForm.ethnicity || ''} onChange={e => setFarmerForm({ ...farmerForm, ethnicity: e.target.value })} style={inputStyle} placeholder="Kinh, Ede, Jarai..." />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'SDT' : 'Phone'}>
                        <input value={farmerForm.phone || ''} onChange={e => setFarmerForm({ ...farmerForm, phone: e.target.value })} style={inputStyle} placeholder="09xx..." />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'CMND/CCCD' : 'ID Card'}>
                        <input value={farmerForm.id_card || ''} onChange={e => setFarmerForm({ ...farmerForm, id_card: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Thon' : 'Village'}>
                        <input value={farmerForm.village || ''} onChange={e => setFarmerForm({ ...farmerForm, village: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Xa' : 'Commune'}>
                        <input value={farmerForm.commune || ''} onChange={e => setFarmerForm({ ...farmerForm, commune: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Huyen' : 'District'}>
                        <input value={farmerForm.district || ''} onChange={e => setFarmerForm({ ...farmerForm, district: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Tinh' : 'Province'}>
                        <input value={farmerForm.province || ''} onChange={e => setFarmerForm({ ...farmerForm, province: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Kinh te ho' : 'Economic Class'}>
                        <select value={farmerForm.economic_class || ''} onChange={e => setFarmerForm({ ...farmerForm, economic_class: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Ngheo">{appLang === 'vi' ? 'Ngheo' : 'Poor'}</option>
                            <option value="Can ngheo">{appLang === 'vi' ? 'Can ngheo' : 'Near poor'}</option>
                            <option value="Binh thuong">{appLang === 'vi' ? 'Binh thuong' : 'Average'}</option>
                            <option value="Kha">{appLang === 'vi' ? 'Kha' : 'Above avg'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Hoc van' : 'Education'}>
                        <input value={farmerForm.education || ''} onChange={e => setFarmerForm({ ...farmerForm, education: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Lop 9, THPT...' : '9th grade, high school...'} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Nam trong ca phe' : 'Coffee years'}>
                        <input type="number" value={farmerForm.coffee_years || ''} onChange={e => setFarmerForm({ ...farmerForm, coffee_years: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'So thanh vien ho' : 'Household size'}>
                        <input type="number" value={farmerForm.household_members || ''} onChange={e => setFarmerForm({ ...farmerForm, household_members: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Thanh vien HTX' : 'Coop member'}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={farmerForm.cooperative_member || false} onChange={e => setFarmerForm({ ...farmerForm, cooperative_member: e.target.checked })} />
                            <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Co' : 'Yes'}</span>
                        </label>
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Ghi chu' : 'Notes'}>
                    <textarea value={farmerForm.notes || ''} onChange={e => setFarmerForm({ ...farmerForm, notes: e.target.value })}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                </FormField>
            </ModalOverlay>
        </>
    );

    const renderFarm = () => (
        <>
            {farm ? (
                <SectionCard title={appLang === 'vi' ? 'Trang trai tham gia mo hinh' : 'Farm in Model'} icon="fa-map-marked-alt"
                    action={canEdit ? <AddButton onClick={openEditFarm} label={appLang === 'vi' ? 'Sua' : 'Edit'} /> : null}>
                    <InfoRow label={appLang === 'vi' ? 'Ten' : 'Name'} value={farm.farm_name} icon="fa-tag" />
                    <InfoRow label={appLang === 'vi' ? 'Tong DT' : 'Total area'} value={farm.total_area ? `${farm.total_area} ha` : null} icon="fa-ruler" />
                    <InfoRow label={appLang === 'vi' ? 'DT ca phe' : 'Coffee area'} value={farm.coffee_area ? `${farm.coffee_area} ha` : null} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'DT xen canh' : 'Intercrop area'} value={farm.intercrop_area ? `${farm.intercrop_area} ha` : null} icon="fa-tree" />
                    <InfoRow label={appLang === 'vi' ? 'Cay xen' : 'Intercrop'} value={farm.intercrop_details} icon="fa-seedling" />
                    <InfoRow label="pH" value={farm.soil_ph} icon="fa-flask" />
                    <InfoRow label={appLang === 'vi' ? 'Loai dat' : 'Soil type'} value={farm.soil_type} icon="fa-mountain" />
                    <InfoRow label={appLang === 'vi' ? 'Do doc' : 'Slope'} value={farm.slope} icon="fa-signal" />
                    <InfoRow label={appLang === 'vi' ? 'Nguon nuoc' : 'Water source'} value={farm.water_source} icon="fa-tint" />
                    <InfoRow label={appLang === 'vi' ? 'Tuoi tieu' : 'Irrigation'} value={farm.irrigation_system} icon="fa-shower" />
                    <InfoRow label={appLang === 'vi' ? 'Do cao' : 'Elevation'} value={farm.elevation ? `${farm.elevation}m` : null} icon="fa-arrow-up" />
                    <InfoRow label="GPS" value={farm.gps_lat && farm.gps_long ? `${farm.gps_lat}, ${farm.gps_long}` : null} icon="fa-map-pin" />
                    <InfoRow label={appLang === 'vi' ? 'Co phu' : 'Grass cover'} value={farm.grass_cover} icon="fa-leaf" />
                    <InfoRow label={appLang === 'vi' ? 'Cay bong mat' : 'Shade trees'} value={farm.shade_trees} icon="fa-tree" />
                </SectionCard>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-map" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                    <p>{appLang === 'vi' ? 'Chua gan trang trai' : 'No farm assigned yet'}</p>
                </div>
            )}

            {plots.length > 0 && (
                <SectionCard title={`${appLang === 'vi' ? 'Cac manh dat cua ho' : 'Land Plots'} (${plots.length})`} icon="fa-th-large">
                    {plots.map(p => (
                        <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--coffee-dark)' }}>{p.plot_name || (appLang === 'vi' ? 'Manh dat' : 'Plot')}</div>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                <span>{p.area_ha} ha</span>
                                {p.tree_count && <span>{p.tree_count} {appLang === 'vi' ? 'goc' : 'trees'}</span>}
                                {p.yield_current && <span>{appLang === 'vi' ? 'SL' : 'Yield'}: {p.yield_current}</span>}
                                {p.intercrop && <span>{appLang === 'vi' ? 'Xen' : 'Intercrop'}: {p.intercrop_species}</span>}
                            </div>
                        </div>
                    ))}
                </SectionCard>
            )}

            {/* Farm Edit Modal */}
            <ModalOverlay
                show={showFarmForm}
                title={appLang === 'vi' ? 'Cap nhat thong tin trang trai' : 'Update Farm Info'}
                onClose={() => setShowFarmForm(false)}
                onSave={handleSaveFarm}
            >
                <FormField label={appLang === 'vi' ? 'Ten trang trai' : 'Farm Name'}>
                    <input value={farmForm.farm_name || ''} onChange={e => setFarmForm({ ...farmForm, farm_name: e.target.value })} style={inputStyle} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Tong DT (ha)' : 'Total Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.total_area || ''} onChange={e => setFarmForm({ ...farmForm, total_area: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'DT ca phe (ha)' : 'Coffee Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.coffee_area || ''} onChange={e => setFarmForm({ ...farmForm, coffee_area: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'DT xen canh (ha)' : 'Intercrop Area (ha)'}>
                        <input type="number" step="0.01" value={farmForm.intercrop_area || ''} onChange={e => setFarmForm({ ...farmForm, intercrop_area: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Chi tiet xen canh' : 'Intercrop Details'}>
                    <input value={farmForm.intercrop_details || ''} onChange={e => setFarmForm({ ...farmForm, intercrop_details: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Bo, sau rieng, tieu...' : 'Avocado, durian, pepper...'} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Loai dat' : 'Soil Type'}>
                        <input value={farmForm.soil_type || ''} onChange={e => setFarmForm({ ...farmForm, soil_type: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Bazan, phu sa...' : 'Basalt, alluvial...'} />
                    </FormField>
                    <FormField label="pH">
                        <input type="number" step="0.1" value={farmForm.soil_ph || ''} onChange={e => setFarmForm({ ...farmForm, soil_ph: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Do doc' : 'Slope'}>
                        <select value={farmForm.slope || ''} onChange={e => setFarmForm({ ...farmForm, slope: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="flat">{appLang === 'vi' ? 'Bang phang' : 'Flat'}</option>
                            <option value="gentle">{appLang === 'vi' ? 'Thoai' : 'Gentle'}</option>
                            <option value="moderate">{appLang === 'vi' ? 'Vua' : 'Moderate'}</option>
                            <option value="steep">{appLang === 'vi' ? 'Doc' : 'Steep'}</option>
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Nguon nuoc' : 'Water Source'}>
                        <input value={farmForm.water_source || ''} onChange={e => setFarmForm({ ...farmForm, water_source: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Gieng, suoi, ho...' : 'Well, stream, pond...'} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'He thong tuoi' : 'Irrigation'}>
                        <input value={farmForm.irrigation_system || ''} onChange={e => setFarmForm({ ...farmForm, irrigation_system: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Nho giot, phun mua...' : 'Drip, sprinkler...'} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Do cao (m)' : 'Elevation (m)'}>
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
                    <FormField label={appLang === 'vi' ? 'Co phu' : 'Grass Cover'}>
                        <select value={farmForm.grass_cover || ''} onChange={e => setFarmForm({ ...farmForm, grass_cover: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            <option value="Low">{appLang === 'vi' ? 'Thap' : 'Low'}</option>
                            <option value="Medium">{appLang === 'vi' ? 'Trung binh' : 'Medium'}</option>
                            <option value="High">{appLang === 'vi' ? 'Cao' : 'High'}</option>
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'So cay bong mat' : 'Shade Trees'}>
                        <input type="number" value={farmForm.shade_trees || ''} onChange={e => setFarmForm({ ...farmForm, shade_trees: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Ghi chu' : 'Notes'}>
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
                title={`${appLang === 'vi' ? 'Nhat ky canh tac' : 'Farm Diary'} (${diary.length})`}
                icon="fa-book"
                action={canEdit ? <AddButton onClick={() => { setDiaryForm(emptyDiary); setEditingItem(null); setShowDiaryForm(true); }} /> : null}
            >
                {diary.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        {appLang === 'vi' ? 'Chua co nhat ky nao.' : 'No diary entries yet.'}{canEdit ? (appLang === 'vi' ? ' Bam "Them" de bat dau ghi chep.' : ' Click "Add" to start.') : ''}
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
                                    {appLang === 'vi' ? 'Vat tu' : 'Material'}: {d.material_name} {d.material_amount && `- ${d.material_amount} ${d.material_unit || ''}`}
                                </div>
                            )}
                            {(d.labor_cost || d.material_cost) && (
                                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                                    {appLang === 'vi' ? 'Chi phi' : 'Cost'}: {((d.labor_cost || 0) + (d.material_cost || 0)).toLocaleString()} d
                                </div>
                            )}
                        </div>
                    ))
                )}
            </SectionCard>

            {/* Diary Form Modal */}
            <ModalOverlay
                show={showDiaryForm}
                title={editingItem ? (appLang === 'vi' ? 'Sua nhat ky' : 'Edit Diary') : (appLang === 'vi' ? 'Them nhat ky' : 'Add Diary Entry')}
                onClose={() => { setShowDiaryForm(false); setEditingItem(null); }}
                onSave={handleSaveDiary}
            >
                <FormField label={appLang === 'vi' ? 'Ngay' : 'Date'} required>
                    <input type="date" value={diaryForm.diary_date} onChange={e => setDiaryForm({ ...diaryForm, diary_date: e.target.value })} style={inputStyle} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Loai hoat dong' : 'Activity Type'} required>
                    <select value={diaryForm.activity_type} onChange={e => setDiaryForm({ ...diaryForm, activity_type: e.target.value })} style={selectStyle}>
                        {ACTIVITY_TYPES.map(a => <option key={a.value} value={a.value}>{a[appLang] || a.vi}</option>)}
                    </select>
                </FormField>
                <FormField label={appLang === 'vi' ? 'Mo ta' : 'Description'} required>
                    <textarea value={diaryForm.description} onChange={e => setDiaryForm({ ...diaryForm, description: e.target.value })}
                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder={appLang === 'vi' ? 'Mo ta cong viec...' : 'Describe the activity...'} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Vat tu' : 'Material'}>
                        <input value={diaryForm.material_name} onChange={e => setDiaryForm({ ...diaryForm, material_name: e.target.value })} style={inputStyle} placeholder="NPK, DAP..." />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'So luong' : 'Amount'}>
                        <input type="number" value={diaryForm.material_amount} onChange={e => setDiaryForm({ ...diaryForm, material_amount: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Don vi' : 'Unit'}>
                        <input value={diaryForm.material_unit} onChange={e => setDiaryForm({ ...diaryForm, material_unit: e.target.value })} style={inputStyle} placeholder="kg, lit..." />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Gio cong' : 'Labor hrs'}>
                        <input type="number" value={diaryForm.labor_hours} onChange={e => setDiaryForm({ ...diaryForm, labor_hours: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'CP nhan cong' : 'Labor cost'}>
                        <input type="number" value={diaryForm.labor_cost} onChange={e => setDiaryForm({ ...diaryForm, labor_cost: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'CP vat tu' : 'Material cost'}>
                        <input type="number" value={diaryForm.material_cost} onChange={e => setDiaryForm({ ...diaryForm, material_cost: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Thoi tiet' : 'Weather'}>
                        <input value={diaryForm.weather} onChange={e => setDiaryForm({ ...diaryForm, weather: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Nang, mua...' : 'Sunny, rainy...'} />
                    </FormField>
                    <FormField label="GCP">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={diaryForm.gcp_compliant} onChange={e => setDiaryForm({ ...diaryForm, gcp_compliant: e.target.checked })} />
                            <span style={{ fontSize: '13px' }}>{appLang === 'vi' ? 'Tuan thu GCP' : 'GCP Compliant'}</span>
                        </label>
                    </FormField>
                </div>
                <FormField label={appLang === 'vi' ? 'Ghi chu' : 'Notes'}>
                    <input value={diaryForm.notes} onChange={e => setDiaryForm({ ...diaryForm, notes: e.target.value })} style={inputStyle} />
                </FormField>
            </ModalOverlay>
        </>
    );

    // ── INSPECTIONS TAB with CRUD ──
    const renderInspections = () => (
        <>
            <SectionCard
                title={`${appLang === 'vi' ? 'Kiem tra dinh ky' : 'Inspections'} (${inspections.length})`}
                icon="fa-clipboard-check"
                action={canEdit ? <AddButton onClick={() => { setInspectForm(emptyInspect); setEditingItem(null); setShowInspectForm(true); }} /> : null}
            >
                {inspections.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        {appLang === 'vi' ? 'Chua co kiem tra nao.' : 'No inspections yet.'}{canEdit ? (appLang === 'vi' ? ' Bam "Them" de them.' : ' Click "Add" to start.') : ''}
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
                                <div>{appLang === 'vi' ? 'Sinh truong' : 'Growth'}: <b>{QUALITY_OPTIONS.find(q => q.value === ins.growth_quality)?.[appLang] || ins.growth_quality || '-'}</b></div>
                                <div>{appLang === 'vi' ? 'Sau benh' : 'Pests'}: <b>{PEST_OPTIONS.find(q => q.value === ins.pest_status)?.[appLang] || ins.pest_status || '-'}</b></div>
                                <div>{appLang === 'vi' ? 'Dat' : 'Soil'}: <b>{QUALITY_OPTIONS.find(q => q.value === ins.soil_condition)?.[appLang] || ins.soil_condition || '-'}</b></div>
                                <div>{appLang === 'vi' ? 'Nuoc' : 'Water'}: <b>{WATER_OPTIONS.find(q => q.value === ins.water_status)?.[appLang] || ins.water_status || '-'}</b></div>
                            </div>
                            {ins.recommendations && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                                    {appLang === 'vi' ? 'Khuyen nghi' : 'Recommendations'}: {ins.recommendations}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </SectionCard>

            {/* Inspection Form Modal */}
            <ModalOverlay
                show={showInspectForm}
                title={editingItem ? (appLang === 'vi' ? 'Sua kiem tra' : 'Edit Inspection') : (appLang === 'vi' ? 'Them kiem tra' : 'Add Inspection')}
                onClose={() => { setShowInspectForm(false); setEditingItem(null); }}
                onSave={handleSaveInspect}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Ngay kiem tra' : 'Date'} required>
                        <input type="date" value={inspectForm.inspection_date} onChange={e => setInspectForm({ ...inspectForm, inspection_date: e.target.value })} style={inputStyle} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Loai' : 'Type'} required>
                        <select value={inspectForm.inspection_type} onChange={e => setInspectForm({ ...inspectForm, inspection_type: e.target.value })} style={selectStyle}>
                            {INSPECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t[appLang] || t.vi}</option>)}
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Sinh truong' : 'Growth Quality'}>
                        <select value={inspectForm.growth_quality} onChange={e => setInspectForm({ ...inspectForm, growth_quality: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Sau benh' : 'Pest Status'}>
                        <select value={inspectForm.pest_status} onChange={e => setInspectForm({ ...inspectForm, pest_status: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {PEST_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Tinh trang dat' : 'Soil Condition'}>
                        <select value={inspectForm.soil_condition} onChange={e => setInspectForm({ ...inspectForm, soil_condition: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Tinh trang nuoc' : 'Water Status'}>
                        <select value={inspectForm.water_status} onChange={e => setInspectForm({ ...inspectForm, water_status: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {WATER_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <FormField label={appLang === 'vi' ? 'Chat luong qua' : 'Fruit Quality'}>
                        <select value={inspectForm.fruit_quality} onChange={e => setInspectForm({ ...inspectForm, fruit_quality: e.target.value })} style={selectStyle}>
                            <option value="">--</option>
                            {QUALITY_OPTIONS.map(q => <option key={q.value} value={q.value}>{q[appLang] || q.vi}</option>)}
                        </select>
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Suc khoe cay (%)' : 'Tree Health %'}>
                        <input type="number" min="0" max="100" value={inspectForm.tree_health_pct} onChange={e => setInspectForm({ ...inspectForm, tree_health_pct: e.target.value })} style={inputStyle} />
                    </FormField>
                </div>
                {inspectForm.pest_status && inspectForm.pest_status !== 'none' && (
                    <FormField label={appLang === 'vi' ? 'Chi tiet sau benh' : 'Pest Details'}>
                        <input value={inspectForm.pest_details} onChange={e => setInspectForm({ ...inspectForm, pest_details: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'Loai sau, muc do...' : 'Pest type, severity...'} />
                    </FormField>
                )}
                <FormField label={appLang === 'vi' ? 'Khuyen nghi' : 'Recommendations'}>
                    <textarea value={inspectForm.recommendations} onChange={e => setInspectForm({ ...inspectForm, recommendations: e.target.value })}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder={appLang === 'vi' ? 'De xuat hanh dong...' : 'Suggested actions...'} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Hanh dong tiep theo' : 'Follow-up Actions'}>
                    <input value={inspectForm.follow_up_actions} onChange={e => setInspectForm({ ...inspectForm, follow_up_actions: e.target.value })} style={inputStyle} />
                </FormField>
                <FormField label={appLang === 'vi' ? 'Ghi chu' : 'Notes'}>
                    <input value={inspectForm.notes} onChange={e => setInspectForm({ ...inspectForm, notes: e.target.value })} style={inputStyle} />
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
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>{appLang === 'vi' ? 'Tong tieu hao' : 'Total Costs'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{totalCost.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>VND</div>
                </div>

                {Object.keys(byCat).length > 0 && (
                    <SectionCard title={appLang === 'vi' ? 'Theo danh muc' : 'By Category'} icon="fa-layer-group">
                        {Object.entries(byCat).map(([cat, total]) => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                                    {CONSUMABLE_CATEGORIES.find(c => c.value === cat)?.[appLang] || cat}
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--coffee-dark)' }}>{total.toLocaleString()}</span>
                            </div>
                        ))}
                    </SectionCard>
                )}

                <SectionCard
                    title={`${appLang === 'vi' ? 'Chi tiet' : 'Details'} (${consumables.length})`}
                    icon="fa-receipt"
                    action={canEdit ? <AddButton onClick={() => { setConsumForm(emptyConsum); setEditingItem(null); setShowConsumForm(true); }} /> : null}
                >
                    {consumables.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                            {appLang === 'vi' ? 'Chua co du lieu.' : 'No data yet.'}{canEdit ? (appLang === 'vi' ? ' Bam "Them" de them.' : ' Click "Add" to start.') : ''}
                        </p>
                    ) : (
                        consumables.map(c => (
                            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{c.item_name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#dc2626', fontWeight: 700 }}>{(c.total_cost || 0).toLocaleString()}</span>
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
                    title={editingItem ? (appLang === 'vi' ? 'Sua tieu hao' : 'Edit Cost') : (appLang === 'vi' ? 'Them tieu hao' : 'Add Cost')}
                    onClose={() => { setShowConsumForm(false); setEditingItem(null); }}
                    onSave={handleSaveConsum}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FormField label={appLang === 'vi' ? 'Ngay' : 'Date'} required>
                            <input type="date" value={consumForm.record_date} onChange={e => setConsumForm({ ...consumForm, record_date: e.target.value })} style={inputStyle} />
                        </FormField>
                        <FormField label={appLang === 'vi' ? 'Danh muc' : 'Category'} required>
                            <select value={consumForm.category} onChange={e => setConsumForm({ ...consumForm, category: e.target.value })} style={selectStyle}>
                                {CONSUMABLE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c[appLang] || c.vi}</option>)}
                            </select>
                        </FormField>
                    </div>
                    <FormField label={appLang === 'vi' ? 'Ten hang muc' : 'Item Name'} required>
                        <input value={consumForm.item_name} onChange={e => setConsumForm({ ...consumForm, item_name: e.target.value })} style={inputStyle} placeholder={appLang === 'vi' ? 'VD: NPK 16-16-8' : 'e.g. NPK 16-16-8'} />
                    </FormField>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <FormField label={appLang === 'vi' ? 'So luong' : 'Quantity'}>
                            <input type="number" value={consumForm.quantity} onChange={e => setConsumForm({ ...consumForm, quantity: e.target.value })} style={inputStyle} />
                        </FormField>
                        <FormField label={appLang === 'vi' ? 'Don vi' : 'Unit'}>
                            <input value={consumForm.unit} onChange={e => setConsumForm({ ...consumForm, unit: e.target.value })} style={inputStyle} placeholder="kg, lit..." />
                        </FormField>
                        <FormField label={appLang === 'vi' ? 'Don gia' : 'Unit Price'}>
                            <input type="number" value={consumForm.unit_price} onChange={e => setConsumForm({ ...consumForm, unit_price: e.target.value })} style={inputStyle} />
                        </FormField>
                    </div>
                    <FormField label={appLang === 'vi' ? 'Tong chi phi (VND)' : 'Total Cost (VND)'}>
                        <input type="number" value={consumForm.total_cost} onChange={e => setConsumForm({ ...consumForm, total_cost: e.target.value })} style={inputStyle}
                            placeholder={consumForm.quantity && consumForm.unit_price ? `Tu tinh: ${Number(consumForm.quantity) * Number(consumForm.unit_price)}` : ''} />
                    </FormField>
                    <FormField label={appLang === 'vi' ? 'Ghi chu' : 'Notes'}>
                        <input value={consumForm.notes} onChange={e => setConsumForm({ ...consumForm, notes: e.target.value })} style={inputStyle} />
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
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>{appLang === 'vi' ? 'Tong dau tu mo hinh' : 'Total Model Investment'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{totalInvest.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>VND</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#166534' }}>{appLang === 'vi' ? 'Tu nhat ky' : 'From Diary'}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534' }}>{diaryCost.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#fef9c3', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#854d0e' }}>{appLang === 'vi' ? 'Tu tieu hao' : 'From Consumables'}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#854d0e' }}>{consumCost.toLocaleString()}</div>
                    </div>
                </div>

                {income && (
                    <SectionCard title={appLang === 'vi' ? 'So sanh thu nhap nong ho' : 'Farmer Income Comparison'} icon="fa-balance-scale">
                        <InfoRow label="Thu nhap rong ho" value={income.total_income ? `${income.total_income} tr.d` : null} icon="fa-wallet" />
                        <InfoRow label="Dau tu mo hinh" value={`${(totalInvest / 1000000).toFixed(1)} tr.d`} icon="fa-piggy-bank" />
                        <InfoRow label="Doanh thu ca phe" value={income.coffee_revenue ? `${income.coffee_revenue} tr.d` : null} icon="fa-mug-hot" />
                    </SectionCard>
                )}
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
                {!canEdit && (
                    <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        background: '#fef3c7', color: '#92400e', whiteSpace: 'nowrap'
                    }}>
                        <i className="fas fa-eye" style={{ marginRight: '4px' }}></i>
                        {appLang === 'vi' ? 'Chi xem' : 'View only'}
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
        </div>
    );
};

export default ModelDetailView;
