/**
 * ModelEconomics.jsx
 * Economics tab for ModelDetailView — handles 5 data collections:
 *   1. farm_background      – Annual tree counts by age cohort
 *   2. initial_investment   – One-time Year-0 establishment costs
 *   3. coffee_cost_entries  – Per-event coffee costs (Labour + Input, by round)
 *   4. intercrop_cost_entries – Per-event intercrop costs
 *   5. revenue_entries      – Per-sale revenue with fresh-cherry conversion
 */
import React, { useState, useEffect, useCallback } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import { formatDate } from './dateUtils';

const fmt = (n) => n != null ? Number(n).toLocaleString('vi-VN') : '---';
const today = () => new Date().toISOString().split('T')[0];
const thisYear = new Date().getFullYear();

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp = {
    width: '100%', padding: '9px 11px', border: '1.5px solid #e2e8f0',
    borderRadius: '9px', fontSize: '13px', background: '#f8fafc',
    outline: 'none', boxSizing: 'border-box',
};
const sel = { ...inp, appearance: 'auto' };

const FF = ({ label, children, span2 }) => (
    <div style={{ marginBottom: '10px', gridColumn: span2 ? 'span 2' : undefined }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>{label}</label>
        {children}
    </div>
);

const SectionCard = ({ title, icon, children, action }) => (
    <div style={{ background: 'white', borderRadius: '14px', padding: '18px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <i className={`fas ${icon}`} style={{ color: 'var(--coffee-primary)' }}></i>{title}
            </h4>
            {action}
        </div>
        {children}
    </div>
);

const AddBtn = ({ onClick, label }) => (
    <button onClick={onClick} style={{
        padding: '6px 13px', border: 'none', borderRadius: '9px', cursor: 'pointer',
        background: 'var(--coffee-primary)', color: 'white', fontSize: '12px', fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: '5px',
    }}>
        <i className="fas fa-plus"></i> {label}
    </button>
);

const ModalSlide = ({ show, title, onClose, onSave, saving, children }) => {
    if (!show) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={onClose}>
            <div style={{ background: 'white', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: '620px', maxHeight: '88vh', overflow: 'auto', padding: '22px', animation: 'slideUp 0.25s ease' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--coffee-dark)' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                {children}
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid #e2e8f0', borderRadius: '11px', background: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>
                        Hủy / Cancel
                    </button>
                    <button onClick={onSave} disabled={saving} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: '11px', background: 'var(--coffee-primary)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                        {saving ? <i className="fas fa-spinner fa-spin"></i> : 'Lưu / Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Sub-tab label maps ────────────────────────────────────────────────────────
const SUBTABS = [
    { id: 'background', vi: 'Nền tảng', en: 'Background', ede: 'Nền', icon: 'fa-tree' },
    { id: 'initial', vi: 'Đầu tư ban đầu', en: 'Initial Invest', ede: 'Đầu tư 0', icon: 'fa-seedling' },
    { id: 'coffee', vi: 'Chi phí cà phê', en: 'Coffee Costs', icon: 'fa-mug-hot' },
    { id: 'intercrop', vi: 'Chi phí xen canh', en: 'Intercrop Costs', icon: 'fa-leaf' },
    { id: 'revenue', vi: 'Doanh thu', en: 'Revenue', ede: 'Prăk mŭt', icon: 'fa-coins' },
];

const INVEST_TYPES = ['Labour', 'Input'];
const INVEST_SUBTYPES = {
    Labour: ['Clearance', 'Hole preparation', 'Plant Coffee and Shade trees', 'Fertilizer', 'Pesticide', 'Weeding'],
    Input: ['Seedlings', 'Fertilizer application - R1', 'Fertilizer application - R2', 'Fertilizer application - R3', 'Pesticide application - R1', 'Pesticide application - R2'],
};
const COST_SUBTYPES = {
    Labour: ['Irrigation', 'Pruning', 'Weeding', 'Fertilizer application', 'Agro-chemical use', 'Harvest'],
    Input: ['Irrigation', 'Fertilizer application', 'Agro-chemical use'],
};
const INTERCROP_COST_SUBTYPES = {
    Labour: ['Pruning', 'Fertilizer application', 'Agro-chemical use', 'Harvest'],
    Input: ['Fertilizer application', 'Agro-chemical use'],
};
const ROUNDS = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5'];
const UNITS = ['Manday', 'Kg', 'Liter', 'Kwh', 'Tree'];
const INTERCROP_TYPES = ['Durian', 'Macadamia', 'Avocado', 'Other'];
const COFFEE_FORMS = ['Fresh cherry', 'Dried cherry', 'Green bean'];
// Conversion factors to fresh-cherry equivalent
const FORM_FACTOR = { 'Fresh cherry': 1, 'Dried cherry': 3, 'Green bean': 5 };

// ── Main component ────────────────────────────────────────────────────────────
const ModelEconomics = ({ model, appLang = 'vi', canEdit = true }) => {
    const t = translations[appLang] || translations.vi;
    const L = (vi, en, ede) => appLang === 'en' ? en : appLang === 'ede' ? (ede || vi) : vi;

    const [subTab, setSubTab] = useState('background');
    const [saving, setSaving] = useState(false);

    // Data states
    const [bgList, setBgList] = useState([]);
    const [iiList, setIiList] = useState([]);
    const [ccList, setCcList] = useState([]);
    const [icList, setIcList] = useState([]);
    const [rvList, setRvList] = useState([]);

    // Modal states
    const [showBgForm, setShowBgForm] = useState(false);
    const [showIiForm, setShowIiForm] = useState(false);
    const [showCcForm, setShowCcForm] = useState(false);
    const [showIcForm, setShowIcForm] = useState(false);
    const [showRvForm, setShowRvForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form data states
    const emptyBg = {
        year: thisYear, farm_size_ha: '',
        coffee_yr1: '', coffee_yr2: '', coffee_yr3: '', coffee_yr4: '', coffee_yr4plus: '',
        durian_yr1: '', durian_yr2: '', durian_yr3: '', durian_yr4: '', durian_yr4plus: '',
        maca_yr1: '', maca_yr2: '', maca_yr3: '', maca_yr4: '', maca_yr4plus: '',
        avocado_yr1: '', avocado_yr2: '', avocado_yr3: '', avocado_yr4: '', avocado_yr4plus: '',
        intercrop5_name: '', intercrop5_total: '', notes: '',
    };
    const emptyIi = { record_date: today(), investment_type: 'Labour', sub_type: '', item: '', brand: '', unit: 'Manday', quantity: '', unit_price: '', total_cost: '', remarks: '' };
    const emptyCc = { record_date: today(), crop_year: thisYear, cost_type: 'Labour', cost_subtype: 'Fertilizer application', allocated_round: 'Round 1', item: '', brand: '', unit: 'Manday', quantity: '', unit_price: '', total_cost: '', remarks: '' };
    const emptyIc = { record_date: today(), crop_year: thisYear, intercrop_type: 'Durian', intercrop_name_other: '', cost_type: 'Labour', cost_subtype: 'Fertilizer application', allocated_round: 'Round 1', item: '', brand: '', unit: 'Manday', quantity: '', unit_price: '', total_cost: '', remarks: '' };
    const emptyRv = { sale_date: today(), crop_year: thisYear, purchasing_agent: '', revenue_source: 'Coffee', coffee_form: 'Fresh cherry', intercrop_type: '', intercrop_name_other: '', quantity_kg: '', unit_price: '', total_revenue: '', remarks: '' };

    const [bgForm, setBgForm] = useState(emptyBg);
    const [iiForm, setIiForm] = useState(emptyIi);
    const [ccForm, setCcForm] = useState(emptyCc);
    const [icForm, setIcForm] = useState(emptyIc);
    const [rvForm, setRvForm] = useState(emptyRv);

    // ── Data loading ──────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (!model?.id) return;
        const f = `model_id='${model.id}'`;
        const [bg, ii, cc, ic, rv] = await Promise.all([
            pb.collection('farm_background').getFullList({ filter: f, sort: '-year' }).catch(() => []),
            pb.collection('initial_investment').getFullList({ filter: f, sort: '-record_date' }).catch(() => []),
            pb.collection('coffee_cost_entries').getFullList({ filter: f, sort: '-record_date' }).catch(() => []),
            pb.collection('intercrop_cost_entries').getFullList({ filter: f, sort: '-record_date' }).catch(() => []),
            pb.collection('revenue_entries').getFullList({ filter: f, sort: '-sale_date' }).catch(() => []),
        ]);
        setBgList(bg); setIiList(ii); setCcList(cc); setIcList(ic); setRvList(rv);
    }, [model?.id]);

    useEffect(() => { load(); }, [load]);

    // Auto-compute total when qty × price change
    const autoTotal = (qty, price) => qty && price ? (Number(qty) * Number(price)) : '';

    // ── CRUD helpers ──────────────────────────────────────────────────────────
    const saveRecord = async (collection, data, resetForm, closeModal, reload) => {
        setSaving(true);
        try {
            const payload = { model_id: model.id, ...data };
            if (editingId) await pb.collection(collection).update(editingId, payload);
            else await pb.collection(collection).create(payload);
            closeModal();
            resetForm();
            setEditingId(null);
            reload();
        } catch (e) { alert('Error: ' + e.message); }
        finally { setSaving(false); }
    };

    const deleteRecord = async (collection, id, reload) => {
        if (!confirm(L('Bạn có chắc muốn xóa?', 'Are you sure you want to delete?'))) return;
        try { await pb.collection(collection).delete(id); reload(); }
        catch (e) { alert('Error: ' + e.message); }
    };

    const openEdit = (item, form, setForm, setShow) => {
        const copy = {};
        Object.keys(form).forEach(k => { copy[k] = item[k] ?? form[k]; });
        if (copy.record_date) copy.record_date = copy.record_date.split('T')[0].split(' ')[0];
        if (copy.sale_date) copy.sale_date = copy.sale_date.split('T')[0].split(' ')[0];
        setForm(copy);
        setEditingId(item.id);
        setShow(true);
    };

    const openAdd = (emptyForm, setForm, setShow) => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setShow(true);
    };

    // ── Action buttons ────────────────────────────────────────────────────────
    const ActBtns = ({ item, emptyForm, form, setForm, setShow, collection, reload }) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {canEdit && <>
                <button onClick={() => openEdit(item, emptyForm, setForm, setShow)} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: '#fef9f0', color: '#92400e', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                    <i className="fas fa-pen"></i>
                </button>
                <button onClick={() => deleteRecord(collection, item.id, reload)} style={{ padding: '4px 10px', border: '1px solid #fee2e2', borderRadius: '7px', background: '#fef2f2', color: '#b91c1c', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                    <i className="fas fa-trash"></i>
                </button>
            </>}
        </div>
    );

    // ── SUMMARY totals ────────────────────────────────────────────────────────
    const totalCost = (list) => list.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
    const totalRev = () => rvList.reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);
    const totalInitInvest = () => totalCost(iiList);
    const totalCoffeeCost = () => totalCost(ccList);
    const totalIntercropCost = () => totalCost(icList);

    // ── TAB: Farm Background ─────────────────────────────────────────────────
    const renderBackground = () => {
        const save = () => saveRecord('farm_background', {
            year: Number(bgForm.year), farm_size_ha: bgForm.farm_size_ha ? Number(bgForm.farm_size_ha) : null,
            coffee_yr1: bgForm.coffee_yr1 ? Number(bgForm.coffee_yr1) : null,
            coffee_yr2: bgForm.coffee_yr2 ? Number(bgForm.coffee_yr2) : null,
            coffee_yr3: bgForm.coffee_yr3 ? Number(bgForm.coffee_yr3) : null,
            coffee_yr4: bgForm.coffee_yr4 ? Number(bgForm.coffee_yr4) : null,
            coffee_yr4plus: bgForm.coffee_yr4plus ? Number(bgForm.coffee_yr4plus) : null,
            durian_yr1: bgForm.durian_yr1 ? Number(bgForm.durian_yr1) : null,
            durian_yr2: bgForm.durian_yr2 ? Number(bgForm.durian_yr2) : null,
            durian_yr3: bgForm.durian_yr3 ? Number(bgForm.durian_yr3) : null,
            durian_yr4: bgForm.durian_yr4 ? Number(bgForm.durian_yr4) : null,
            durian_yr4plus: bgForm.durian_yr4plus ? Number(bgForm.durian_yr4plus) : null,
            maca_yr1: bgForm.maca_yr1 ? Number(bgForm.maca_yr1) : null,
            maca_yr2: bgForm.maca_yr2 ? Number(bgForm.maca_yr2) : null,
            maca_yr3: bgForm.maca_yr3 ? Number(bgForm.maca_yr3) : null,
            maca_yr4: bgForm.maca_yr4 ? Number(bgForm.maca_yr4) : null,
            maca_yr4plus: bgForm.maca_yr4plus ? Number(bgForm.maca_yr4plus) : null,
            avocado_yr1: bgForm.avocado_yr1 ? Number(bgForm.avocado_yr1) : null,
            avocado_yr4plus: bgForm.avocado_yr4plus ? Number(bgForm.avocado_yr4plus) : null,
            intercrop5_name: bgForm.intercrop5_name || null,
            intercrop5_total: bgForm.intercrop5_total ? Number(bgForm.intercrop5_total) : null,
            notes: bgForm.notes || null,
        }, () => setBgForm(emptyBg), () => setShowBgForm(false), load);

        const TreeRow = ({ label, prefix }) => (
            <tr>
                <td style={{ padding: '6px 8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>{label}</td>
                {['yr1', 'yr2', 'yr3', 'yr4', 'yr4plus'].map(k => (
                    <td key={k} style={{ padding: '4px' }}>
                        <input type="number" min="0" style={{ ...inp, width: '60px', textAlign: 'center', padding: '5px' }}
                            value={bgForm[`${prefix}_${k}`]} onChange={e => setBgForm({ ...bgForm, [`${prefix}_${k}`]: e.target.value })} />
                    </td>
                ))}
            </tr>
        );

        return (
            <>
                <SectionCard title={L('Nền tảng mô hình (Hàng năm)', 'Farm Background (Annual)')} icon="fa-tree"
                    action={canEdit && <AddBtn onClick={() => openAdd(emptyBg, setBgForm, setShowBgForm)} label={L('Cập nhật', 'Update')} />}>
                    {bgList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>{L('Chưa có dữ liệu', 'No data yet')}</p> : (
                        bgList.map(r => (
                            <div key={r.id} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--coffee-primary)' }}>{L('Năm', 'Year')} {r.year}</span>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>{r.farm_size_ha} ha</span>
                                        <ActBtns item={r} emptyForm={emptyBg} form={bgForm} setForm={setBgForm} setShow={setShowBgForm} collection="farm_background" reload={load} />
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b' }}>{L('Loại cây', 'Tree type')}</th>
                                                {['Yr1', 'Yr2', 'Yr3', 'Yr4', '4+'].map(h => <th key={h} style={{ padding: '6px', textAlign: 'center', color: '#64748b' }}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { label: L('Cà phê', 'Coffee'), prefix: 'coffee' },
                                                { label: L('Sầu riêng', 'Durian'), prefix: 'durian' },
                                                { label: L('Mắc ca', 'Macadamia'), prefix: 'maca' },
                                                { label: L('Bơ', 'Avocado'), prefix: 'avocado' },
                                            ].map(({ label, prefix }) => (
                                                <tr key={prefix} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{label}</td>
                                                    {['yr1', 'yr2', 'yr3', 'yr4', 'yr4plus'].map(k => (
                                                        <td key={k} style={{ padding: '5px', textAlign: 'center' }}>{r[`${prefix}_${k}`] || 0}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </SectionCard>

                <ModalSlide show={showBgForm} title={L('Cập nhật nền tảng mô hình', 'Update Farm Background')} onClose={() => setShowBgForm(false)} onSave={save} saving={saving}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FF label={L('Năm báo cáo *', 'Reporting Year *')}>
                            <input style={inp} type="number" min="2020" max="2040" value={bgForm.year} onChange={e => setBgForm({ ...bgForm, year: e.target.value })} />
                        </FF>
                        <FF label={L('Diện tích nông trại (ha)', 'Farm Size (ha)')}>
                            <input style={inp} type="number" step="0.01" value={bgForm.farm_size_ha} onChange={e => setBgForm({ ...bgForm, farm_size_ha: e.target.value })} />
                        </FF>
                    </div>
                    <div style={{ marginTop: '8px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '7px 8px', fontSize: '11px', textAlign: 'left', color: '#64748b' }}>{L('Loại cây', 'Tree')}</th>
                                    {[L('Năm 1', 'Yr 1'), L('Năm 2', 'Yr 2'), L('Năm 3', 'Yr 3'), L('Năm 4', 'Yr 4'), '4+'].map(h =>
                                        <th key={h} style={{ padding: '7px 4px', fontSize: '11px', textAlign: 'center', color: '#64748b' }}>{h}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                <TreeRow label={L('Cà phê', 'Coffee')} prefix="coffee" />
                                <TreeRow label={L('Sầu riêng', 'Durian')} prefix="durian" />
                                <TreeRow label={L('Mắc ca', 'Macadamia')} prefix="maca" />
                                <TreeRow label={L('Bơ', 'Avocado')} prefix="avocado" />
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        <FF label={L('Cây xen canh khác (tên)', 'Other intercrop (name)')}>
                            <input style={inp} value={bgForm.intercrop5_name} onChange={e => setBgForm({ ...bgForm, intercrop5_name: e.target.value })} />
                        </FF>
                        <FF label={L('Tổng số cây', 'Total trees')}>
                            <input style={inp} type="number" value={bgForm.intercrop5_total} onChange={e => setBgForm({ ...bgForm, intercrop5_total: e.target.value })} />
                        </FF>
                        <FF label={L('Ghi chú', 'Notes')} span2>
                            <textarea style={{ ...inp, resize: 'vertical' }} rows="2" value={bgForm.notes} onChange={e => setBgForm({ ...bgForm, notes: e.target.value })} />
                        </FF>
                    </div>
                </ModalSlide>
            </>
        );
    };

    // ── TAB: Initial Investment ───────────────────────────────────────────────
    const renderInitialInvest = () => {
        const save = () => saveRecord('initial_investment', {
            record_date: iiForm.record_date || null,
            investment_type: iiForm.investment_type,
            sub_type: iiForm.sub_type || null,
            item: iiForm.item || null,
            brand: iiForm.brand || null,
            unit: iiForm.unit || null,
            quantity: iiForm.quantity ? Number(iiForm.quantity) : null,
            unit_price: iiForm.unit_price ? Number(iiForm.unit_price) : null,
            total_cost: iiForm.total_cost ? Number(iiForm.total_cost) : (iiForm.quantity && iiForm.unit_price ? Number(iiForm.quantity) * Number(iiForm.unit_price) : null),
            remarks: iiForm.remarks || null,
        }, () => setIiForm(emptyIi), () => setShowIiForm(false), load);

        const total = totalInitInvest();
        return (
            <>
                {total > 0 && (
                    <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: '14px', padding: '16px', marginBottom: '14px', color: 'white' }}>
                        <div style={{ fontSize: '12px', opacity: 0.85 }}>{L('Tổng đầu tư ban đầu (Năm 0)', 'Total Initial Investment (Year 0)')}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{fmt(total)} VNĐ</div>
                    </div>
                )}
                <SectionCard title={L('Đầu tư ban đầu (1 lần - Năm 0)', 'Initial Investment (Year 0 – One-time)')} icon="fa-seedling"
                    action={canEdit && <AddBtn onClick={() => openAdd(emptyIi, setIiForm, setShowIiForm)} label={L('Ghi nhận', 'Record')} />}>
                    {iiList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>{L('Chưa có dữ liệu', 'No data yet')}</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {[L('Ngày', 'Date'), L('Loại', 'Type'), L('Nhóm', 'Group'), L('Vật tư / HĐ', 'Item'), L('ĐV', 'Unit'), L('SL', 'Qty'), L('Đơn giá', 'Price'), L('Thành tiền', 'Total'), ''].map(h =>
                                            <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {iiList.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{formatDate(r.record_date)}</td>
                                            <td style={{ padding: '6px 8px' }}><span style={{ background: r.investment_type === 'Labour' ? '#dbeafe' : '#fef9c3', color: r.investment_type === 'Labour' ? '#1e40af' : '#92400e', padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>{r.investment_type}</span></td>
                                            <td style={{ padding: '6px 8px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub_type}</td>
                                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item}</td>
                                            <td style={{ padding: '6px 8px' }}>{r.unit}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.quantity}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(r.unit_price)}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>{fmt(r.total_cost)}</td>
                                            <td style={{ padding: '4px 6px' }}>
                                                <ActBtns item={r} emptyForm={emptyIi} form={iiForm} setForm={setIiForm} setShow={setShowIiForm} collection="initial_investment" reload={load} />
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                                        <td colSpan="7" style={{ padding: '7px 8px', color: '#475569' }}>TOTAL</td>
                                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#7c3aed' }}>{fmt(total)}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <ModalSlide show={showIiForm} title={L('Ghi nhận đầu tư ban đầu', 'Record Initial Investment')} onClose={() => setShowIiForm(false)} onSave={save} saving={saving}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FF label={L('Ngày', 'Date')}>
                            <input style={inp} type="date" value={iiForm.record_date} onChange={e => setIiForm({ ...iiForm, record_date: e.target.value })} />
                        </FF>
                        <FF label={L('Loại đầu tư *', 'Investment Type *')}>
                            <select style={sel} value={iiForm.investment_type} onChange={e => setIiForm({ ...iiForm, investment_type: e.target.value, sub_type: '' })}>
                                {INVEST_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Nhóm hoạt động / vật tư', 'Activity / Input Group')}>
                            <select style={sel} value={iiForm.sub_type} onChange={e => setIiForm({ ...iiForm, sub_type: e.target.value })}>
                                <option value="">--</option>
                                {(INVEST_SUBTYPES[iiForm.investment_type] || []).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Tên vật tư / hoạt động', 'Item Name')}>
                            <input style={inp} value={iiForm.item} onChange={e => setIiForm({ ...iiForm, item: e.target.value })} />
                        </FF>
                        <FF label={L('Thương hiệu', 'Brand')}>
                            <input style={inp} value={iiForm.brand} onChange={e => setIiForm({ ...iiForm, brand: e.target.value })} />
                        </FF>
                        <FF label={L('Đơn vị', 'Unit')}>
                            <select style={sel} value={iiForm.unit} onChange={e => setIiForm({ ...iiForm, unit: e.target.value })}>
                                {UNITS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Số lượng', 'Quantity')}>
                            <input style={inp} type="number" value={iiForm.quantity} onChange={e => { const q = e.target.value; setIiForm({ ...iiForm, quantity: q, total_cost: autoTotal(q, iiForm.unit_price) }); }} />
                        </FF>
                        <FF label={L('Đơn giá (VNĐ)', 'Unit Price (VND)')}>
                            <input style={inp} type="number" value={iiForm.unit_price} onChange={e => { const p = e.target.value; setIiForm({ ...iiForm, unit_price: p, total_cost: autoTotal(iiForm.quantity, p) }); }} />
                        </FF>
                        <FF label={L('Thành tiền (tự tính)', 'Total (auto-calc)')} span2>
                            <input style={{ ...inp, background: '#f0fdf4', fontWeight: 700, color: '#166534' }} type="number" value={iiForm.total_cost} onChange={e => setIiForm({ ...iiForm, total_cost: e.target.value })} />
                        </FF>
                        <FF label={L('Ghi chú', 'Remarks')} span2>
                            <textarea style={{ ...inp, resize: 'vertical' }} rows="2" value={iiForm.remarks} onChange={e => setIiForm({ ...iiForm, remarks: e.target.value })} />
                        </FF>
                    </div>
                </ModalSlide>
            </>
        );
    };

    // ── TAB: Coffee Costs ─────────────────────────────────────────────────────
    const renderCoffeeCosts = () => {
        const save = () => saveRecord('coffee_cost_entries', {
            record_date: ccForm.record_date || null,
            crop_year: Number(ccForm.crop_year),
            cost_type: ccForm.cost_type,
            cost_subtype: ccForm.cost_subtype || null,
            allocated_round: ccForm.allocated_round || null,
            item: ccForm.item || null, brand: ccForm.brand || null,
            unit: ccForm.unit || null,
            quantity: ccForm.quantity ? Number(ccForm.quantity) : null,
            unit_price: ccForm.unit_price ? Number(ccForm.unit_price) : null,
            total_cost: ccForm.total_cost ? Number(ccForm.total_cost) : (ccForm.quantity && ccForm.unit_price ? Number(ccForm.quantity) * Number(ccForm.unit_price) : null),
            remarks: ccForm.remarks || null,
        }, () => setCcForm(emptyCc), () => setShowCcForm(false), load);

        const totalA = ccList.filter(r => r.cost_type === 'Labour').reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
        const totalB = ccList.filter(r => r.cost_type === 'Input').reduce((s, r) => s + (Number(r.total_cost) || 0), 0);

        return (
            <>
                {ccList.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        {[
                            { label: L('Chi phí lao động (A)', 'Labour Cost (A)'), val: totalA, color: '#2563eb' },
                            { label: L('Chi phí vật tư (B)', 'Input Cost (B)'), val: totalB, color: '#d97706' },
                            { label: L('Tổng chi phí (A+B)', 'Total Cost (A+B)'), val: totalA + totalB, color: '#059669' },
                        ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{label}</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color }}>{fmt(val)}</div>
                            </div>
                        ))}
                    </div>
                )}
                <SectionCard title={L('Chi phí cà phê (Theo sự kiện)', 'Coffee Costs (Per Event)')} icon="fa-mug-hot"
                    action={canEdit && <AddBtn onClick={() => openAdd(emptyCc, setCcForm, setShowCcForm)} label={L('Ghi chi phí', 'Record Cost')} />}>
                    {ccList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>{L('Chưa có dữ liệu', 'No data yet')}</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Ngày/Date', 'Year', L('Loại', 'Type'), L('Hoạt động', 'Activity'), L('Lần', 'Round'), L('Vật tư', 'Item'), L('TH', 'Brand'), L('ĐV', 'Unit'), L('SL', 'Qty'), L('Đơn giá', 'Price'), L('Thành tiền', 'Total'), ''].map(h =>
                                            <th key={h} style={{ padding: '6px 6px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '11px' }}>{h}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ccList.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', fontSize: '11px' }}>{formatDate(r.record_date)}</td>
                                            <td style={{ padding: '5px 6px' }}>{r.crop_year}</td>
                                            <td style={{ padding: '5px 6px' }}><span style={{ background: r.cost_type === 'Labour' ? '#dbeafe' : '#fef9c3', color: r.cost_type === 'Labour' ? '#1e40af' : '#92400e', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 700 }}>{r.cost_type}</span></td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px' }}>{r.cost_subtype}</td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px' }}>{r.allocated_round}</td>
                                            <td style={{ padding: '5px 6px', fontWeight: 600, fontSize: '11px' }}>{r.item}</td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px', color: '#64748b' }}>{r.brand}</td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px' }}>{r.unit}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>{r.quantity}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>{fmt(r.unit_price)}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{fmt(r.total_cost)}</td>
                                            <td><ActBtns item={r} emptyForm={emptyCc} form={ccForm} setForm={setCcForm} setShow={setShowCcForm} collection="coffee_cost_entries" reload={load} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <ModalSlide show={showCcForm} title={L('Ghi nhận chi phí cà phê', 'Record Coffee Cost')} onClose={() => setShowCcForm(false)} onSave={save} saving={saving}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FF label={L('Ngày', 'Date')}>
                            <input style={inp} type="date" value={ccForm.record_date} onChange={e => setCcForm({ ...ccForm, record_date: e.target.value })} />
                        </FF>
                        <FF label={L('Năm vụ mùa', 'Crop Year')}>
                            <input style={inp} type="number" value={ccForm.crop_year} onChange={e => setCcForm({ ...ccForm, crop_year: e.target.value })} />
                        </FF>
                        <FF label={L('Loại chi phí *', 'Cost Type *')}>
                            <select style={sel} value={ccForm.cost_type} onChange={e => setCcForm({ ...ccForm, cost_type: e.target.value, cost_subtype: '' })}>
                                <option value="Labour">Labour</option>
                                <option value="Input">Input</option>
                            </select>
                        </FF>
                        <FF label={L('Hoạt động canh tác', 'Farming Activity')}>
                            <select style={sel} value={ccForm.cost_subtype} onChange={e => setCcForm({ ...ccForm, cost_subtype: e.target.value })}>
                                <option value="">--</option>
                                {(COST_SUBTYPES[ccForm.cost_type] || []).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Lần thực hiện', 'Round')}>
                            <select style={sel} value={ccForm.allocated_round} onChange={e => setCcForm({ ...ccForm, allocated_round: e.target.value })}>
                                {ROUNDS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Đơn vị', 'Unit')}>
                            <select style={sel} value={ccForm.unit} onChange={e => setCcForm({ ...ccForm, unit: e.target.value })}>
                                {UNITS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Tên vật tư / hoạt động', 'Item')}>
                            <input style={inp} value={ccForm.item} onChange={e => setCcForm({ ...ccForm, item: e.target.value })} />
                        </FF>
                        <FF label={L('Thương hiệu', 'Brand')}>
                            <input style={inp} value={ccForm.brand} onChange={e => setCcForm({ ...ccForm, brand: e.target.value })} />
                        </FF>
                        <FF label={L('Số lượng', 'Quantity')}>
                            <input style={inp} type="number" value={ccForm.quantity} onChange={e => { const q = e.target.value; setCcForm({ ...ccForm, quantity: q, total_cost: autoTotal(q, ccForm.unit_price) }); }} />
                        </FF>
                        <FF label={L('Đơn giá (VNĐ)', 'Unit Price (VND)')}>
                            <input style={inp} type="number" value={ccForm.unit_price} onChange={e => { const p = e.target.value; setCcForm({ ...ccForm, unit_price: p, total_cost: autoTotal(ccForm.quantity, p) }); }} />
                        </FF>
                        <FF label={L('Thành tiền (tự tính)', 'Total (auto)')} span2>
                            <input style={{ ...inp, background: '#f0fdf4', fontWeight: 700, color: '#166534' }} type="number" value={ccForm.total_cost} onChange={e => setCcForm({ ...ccForm, total_cost: e.target.value })} />
                        </FF>
                        <FF label={L('Ghi chú', 'Remarks')} span2>
                            <textarea style={{ ...inp, resize: 'vertical' }} rows="2" value={ccForm.remarks} onChange={e => setCcForm({ ...ccForm, remarks: e.target.value })} />
                        </FF>
                    </div>
                </ModalSlide>
            </>
        );
    };

    // ── TAB: Intercrop Costs ──────────────────────────────────────────────────
    const renderIntercropCosts = () => {
        const save = () => saveRecord('intercrop_cost_entries', {
            record_date: icForm.record_date || null,
            crop_year: Number(icForm.crop_year),
            intercrop_type: icForm.intercrop_type || null,
            intercrop_name_other: icForm.intercrop_name_other || null,
            cost_type: icForm.cost_type,
            cost_subtype: icForm.cost_subtype || null,
            allocated_round: icForm.allocated_round || null,
            item: icForm.item || null, brand: icForm.brand || null,
            unit: icForm.unit || null,
            quantity: icForm.quantity ? Number(icForm.quantity) : null,
            unit_price: icForm.unit_price ? Number(icForm.unit_price) : null,
            total_cost: icForm.total_cost ? Number(icForm.total_cost) : (icForm.quantity && icForm.unit_price ? Number(icForm.quantity) * Number(icForm.unit_price) : null),
            remarks: icForm.remarks || null,
        }, () => setIcForm(emptyIc), () => setShowIcForm(false), load);

        return (
            <>
                <SectionCard title={L('Chi phí cây xen canh (Theo sự kiện)', 'Intercrop Costs (Per Event)')} icon="fa-leaf"
                    action={canEdit && <AddBtn onClick={() => openAdd(emptyIc, setIcForm, setShowIcForm)} label={L('Ghi chi phí', 'Record Cost')} />}>
                    {icList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>{L('Chưa có dữ liệu', 'No data yet')}</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Ngày', L('Cây', 'Crop'), L('Loại', 'Type'), L('Hoạt động', 'Activity'), L('Lần', 'Round'), L('Vật tư', 'Item'), L('ĐV', 'Unit'), L('SL', 'Qty'), L('Đơn giá', 'Price'), L('Thành tiền', 'Total'), ''].map(h =>
                                            <th key={h} style={{ padding: '6px 6px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '11px' }}>{h}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {icList.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', fontSize: '11px' }}>{formatDate(r.record_date)}</td>
                                            <td style={{ padding: '5px 6px', fontWeight: 600, color: '#059669', fontSize: '11px' }}>{r.intercrop_type === 'Other' ? r.intercrop_name_other : r.intercrop_type}</td>
                                            <td style={{ padding: '5px 6px' }}><span style={{ background: r.cost_type === 'Labour' ? '#dbeafe' : '#fef9c3', color: r.cost_type === 'Labour' ? '#1e40af' : '#92400e', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 700 }}>{r.cost_type}</span></td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px' }}>{r.cost_subtype}</td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px' }}>{r.allocated_round}</td>
                                            <td style={{ padding: '5px 6px', fontWeight: 600, fontSize: '11px' }}>{r.item}</td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px' }}>{r.unit}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>{r.quantity}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>{fmt(r.unit_price)}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{fmt(r.total_cost)}</td>
                                            <td><ActBtns item={r} emptyForm={emptyIc} form={icForm} setForm={setIcForm} setShow={setShowIcForm} collection="intercrop_cost_entries" reload={load} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <ModalSlide show={showIcForm} title={L('Ghi nhận chi phí xen canh', 'Record Intercrop Cost')} onClose={() => setShowIcForm(false)} onSave={save} saving={saving}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FF label={L('Ngày', 'Date')}>
                            <input style={inp} type="date" value={icForm.record_date} onChange={e => setIcForm({ ...icForm, record_date: e.target.value })} />
                        </FF>
                        <FF label={L('Năm vụ mùa', 'Crop Year')}>
                            <input style={inp} type="number" value={icForm.crop_year} onChange={e => setIcForm({ ...icForm, crop_year: e.target.value })} />
                        </FF>
                        <FF label={L('Loại cây xen canh', 'Intercrop Type')}>
                            <select style={sel} value={icForm.intercrop_type} onChange={e => setIcForm({ ...icForm, intercrop_type: e.target.value })}>
                                {INTERCROP_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        {icForm.intercrop_type === 'Other' && (
                            <FF label={L('Tên cây khác', 'Other crop name')}>
                                <input style={inp} value={icForm.intercrop_name_other} onChange={e => setIcForm({ ...icForm, intercrop_name_other: e.target.value })} />
                            </FF>
                        )}
                        <FF label={L('Loại chi phí *', 'Cost Type *')}>
                            <select style={sel} value={icForm.cost_type} onChange={e => setIcForm({ ...icForm, cost_type: e.target.value, cost_subtype: '' })}>
                                <option value="Labour">Labour</option>
                                <option value="Input">Input</option>
                            </select>
                        </FF>
                        <FF label={L('Hoạt động', 'Activity')}>
                            <select style={sel} value={icForm.cost_subtype} onChange={e => setIcForm({ ...icForm, cost_subtype: e.target.value })}>
                                <option value="">--</option>
                                {(INTERCROP_COST_SUBTYPES[icForm.cost_type] || []).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Lần thực hiện', 'Round')}>
                            <select style={sel} value={icForm.allocated_round} onChange={e => setIcForm({ ...icForm, allocated_round: e.target.value })}>
                                {ROUNDS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Đơn vị', 'Unit')}>
                            <select style={sel} value={icForm.unit} onChange={e => setIcForm({ ...icForm, unit: e.target.value })}>
                                {UNITS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </FF>
                        <FF label={L('Tên vật tư', 'Item')}>
                            <input style={inp} value={icForm.item} onChange={e => setIcForm({ ...icForm, item: e.target.value })} />
                        </FF>
                        <FF label={L('Thương hiệu', 'Brand')}>
                            <input style={inp} value={icForm.brand} onChange={e => setIcForm({ ...icForm, brand: e.target.value })} />
                        </FF>
                        <FF label={L('Số lượng', 'Quantity')}>
                            <input style={inp} type="number" value={icForm.quantity} onChange={e => { const q = e.target.value; setIcForm({ ...icForm, quantity: q, total_cost: autoTotal(q, icForm.unit_price) }); }} />
                        </FF>
                        <FF label={L('Đơn giá', 'Unit Price')}>
                            <input style={inp} type="number" value={icForm.unit_price} onChange={e => { const p = e.target.value; setIcForm({ ...icForm, unit_price: p, total_cost: autoTotal(icForm.quantity, p) }); }} />
                        </FF>
                        <FF label={L('Thành tiền (tự tính)', 'Total (auto)')} span2>
                            <input style={{ ...inp, background: '#f0fdf4', fontWeight: 700, color: '#166534' }} type="number" value={icForm.total_cost} onChange={e => setIcForm({ ...icForm, total_cost: e.target.value })} />
                        </FF>
                    </div>
                </ModalSlide>
            </>
        );
    };

    // ── TAB: Revenue ─────────────────────────────────────────────────────────
    const renderRevenue = () => {
        const save = () => {
            const qty = Number(rvForm.quantity_kg) || 0;
            const price = Number(rvForm.unit_price) || 0;
            const total = rvForm.total_revenue ? Number(rvForm.total_revenue) : (qty && price ? qty * price : null);
            const factor = FORM_FACTOR[rvForm.coffee_form] || 1;
            const qtyFresh = rvForm.revenue_source === 'Coffee' ? qty * factor : null;
            const priceFresh = rvForm.revenue_source === 'Coffee' && factor > 1 ? price / factor : null;

            saveRecord('revenue_entries', {
                sale_date: rvForm.sale_date || null,
                crop_year: Number(rvForm.crop_year),
                purchasing_agent: rvForm.purchasing_agent || null,
                revenue_source: rvForm.revenue_source,
                coffee_form: rvForm.revenue_source === 'Coffee' ? rvForm.coffee_form : null,
                intercrop_type: rvForm.revenue_source === 'Intercrop' ? rvForm.intercrop_type : null,
                intercrop_name_other: rvForm.intercrop_name_other || null,
                quantity_kg: qty || null,
                unit_price: price || null,
                total_revenue: total,
                qty_fresh_cherry_equiv: qtyFresh,
                price_fresh_cherry_equiv: priceFresh,
                remarks: rvForm.remarks || null,
            }, () => setRvForm(emptyRv), () => setShowRvForm(false), load);
        };

        const totalRevenue = totalRev();
        const totalCoffeeRev = rvList.filter(r => r.revenue_source === 'Coffee').reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);
        const totalIntercropRev = rvList.filter(r => r.revenue_source === 'Intercrop').reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);
        const totalFreshEquiv = rvList.filter(r => r.qty_fresh_cherry_equiv).reduce((s, r) => s + (Number(r.qty_fresh_cherry_equiv) || 0), 0);

        return (
            <>
                {rvList.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        {[
                            { label: L('Doanh thu cà phê', 'Coffee Revenue'), val: totalCoffeeRev, color: '#c2410c' },
                            { label: L('Doanh thu xen canh', 'Intercrop Revenue'), val: totalIntercropRev, color: '#059669' },
                            { label: L('Tổng doanh thu', 'Total Revenue'), val: totalRevenue, color: '#7c3aed', span: 2 },
                        ].map(({ label, val, color, span }) => (
                            <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', textAlign: 'center', gridColumn: span ? `span ${span}` : undefined }}>
                                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{label}</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color }}>{fmt(val)}<span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b', marginLeft: '4px' }}>VNĐ</span></div>
                            </div>
                        ))}
                        {totalFreshEquiv > 0 && (
                            <div style={{ background: '#fef9c3', borderRadius: '12px', padding: '12px', gridColumn: 'span 2', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#92400e' }}>{L('Tổng cà phê tươi quy đổi (Fresh cherry equivalent)', 'Total fresh cherry equivalent')}</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#78350f' }}>{Math.round(totalFreshEquiv).toLocaleString('vi-VN')} kg</div>
                                <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px' }}>{L('Quy đổi: Khô ×3 | Nhân ×5 | Tươi ×1', 'Conversion: Dried ×3 | Green bean ×5 | Fresh ×1')}</div>
                            </div>
                        )}
                    </div>
                )}
                <SectionCard title={L('Doanh thu (Theo giao dịch bán)', 'Revenue (Per Sale Transaction)')} icon="fa-coins"
                    action={canEdit && <AddBtn onClick={() => openAdd(emptyRv, setRvForm, setShowRvForm)} label={L('Ghi doanh thu', 'Record Revenue')} />}>
                    {rvList.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>{L('Chưa có dữ liệu', 'No data yet')}</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {[L('Ngày bán', 'Date'), L('Đại lý', 'Agent'), L('Nguồn', 'Source'), L('Hình thức', 'Form'), L('SL (kg)', 'Qty kg'), L('Đơn giá', 'Price'), L('Doanh thu', 'Revenue'), L('Tươi qđ (kg)', 'Fresh eq.'), ''].map(h =>
                                            <th key={h} style={{ padding: '6px 6px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '11px' }}>{h}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rvList.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', fontSize: '11px' }}>{formatDate(r.sale_date)}</td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px' }}>{r.purchasing_agent}</td>
                                            <td style={{ padding: '5px 6px' }}><span style={{ background: r.revenue_source === 'Coffee' ? '#fff7ed' : '#f0fdf4', color: r.revenue_source === 'Coffee' ? '#c2410c' : '#166534', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 700 }}>{r.revenue_source}</span></td>
                                            <td style={{ padding: '5px 6px', fontSize: '11px', color: '#64748b' }}>{r.coffee_form || r.intercrop_type}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600 }}>{r.quantity_kg?.toLocaleString('vi-VN')}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>{fmt(r.unit_price)}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>{fmt(r.total_revenue)}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#92400e', fontWeight: 600 }}>{r.qty_fresh_cherry_equiv ? Math.round(r.qty_fresh_cherry_equiv).toLocaleString('vi-VN') : '---'}</td>
                                            <td><ActBtns item={r} emptyForm={emptyRv} form={rvForm} setForm={setRvForm} setShow={setShowRvForm} collection="revenue_entries" reload={load} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <ModalSlide show={showRvForm} title={L('Ghi nhận doanh thu', 'Record Revenue')} onClose={() => setShowRvForm(false)} onSave={save} saving={saving}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <FF label={L('Ngày bán', 'Sale Date')}>
                            <input style={inp} type="date" value={rvForm.sale_date} onChange={e => setRvForm({ ...rvForm, sale_date: e.target.value })} />
                        </FF>
                        <FF label={L('Năm vụ mùa', 'Crop Year')}>
                            <input style={inp} type="number" value={rvForm.crop_year} onChange={e => setRvForm({ ...rvForm, crop_year: e.target.value })} />
                        </FF>
                        <FF label={L('Điểm thu mua / Đại lý', 'Collection Point / Agent')} span2>
                            <input style={inp} value={rvForm.purchasing_agent} onChange={e => setRvForm({ ...rvForm, purchasing_agent: e.target.value })} placeholder="Agent A, B, C..." />
                        </FF>
                        <FF label={L('Nguồn doanh thu *', 'Revenue Source *')}>
                            <select style={sel} value={rvForm.revenue_source} onChange={e => setRvForm({ ...rvForm, revenue_source: e.target.value, coffee_form: 'Fresh cherry', intercrop_type: '' })}>
                                <option value="Coffee">{L('Cà phê', 'Coffee')}</option>
                                <option value="Intercrop">{L('Cây xen canh', 'Intercrop')}</option>
                            </select>
                        </FF>
                        {rvForm.revenue_source === 'Coffee' ? (
                            <FF label={L('Hình thức bán cà phê', 'Coffee Sale Form')}>
                                <select style={sel} value={rvForm.coffee_form} onChange={e => setRvForm({ ...rvForm, coffee_form: e.target.value })}>
                                    {COFFEE_FORMS.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </FF>
                        ) : (
                            <FF label={L('Loại cây xen canh', 'Intercrop Type')}>
                                <select style={sel} value={rvForm.intercrop_type} onChange={e => setRvForm({ ...rvForm, intercrop_type: e.target.value })}>
                                    <option value="">--</option>
                                    {INTERCROP_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </FF>
                        )}
                        {rvForm.revenue_source === 'Coffee' && rvForm.coffee_form !== 'Fresh cherry' && (
                            <div style={{ gridColumn: 'span 2', background: '#fef9c3', borderRadius: '9px', padding: '8px 12px', fontSize: '11px', color: '#92400e' }}>
                                <i className="fas fa-info-circle"></i> {L('Quy đổi tự động:', 'Auto-conversion:')} {rvForm.coffee_form === 'Dried cherry' ? '×3' : '×5'} → Fresh cherry equivalent
                            </div>
                        )}
                        <FF label={L('Số lượng (kg)', 'Quantity (kg)')}>
                            <input style={inp} type="number" value={rvForm.quantity_kg} onChange={e => { const q = e.target.value; setRvForm({ ...rvForm, quantity_kg: q, total_revenue: autoTotal(q, rvForm.unit_price) }); }} />
                        </FF>
                        <FF label={L('Đơn giá (VNĐ/kg)', 'Unit Price (VND/kg)')}>
                            <input style={inp} type="number" value={rvForm.unit_price} onChange={e => { const p = e.target.value; setRvForm({ ...rvForm, unit_price: p, total_revenue: autoTotal(rvForm.quantity_kg, p) }); }} />
                        </FF>
                        <FF label={L('Doanh thu (tự tính)', 'Revenue (auto)')} span2>
                            <input style={{ ...inp, background: '#f0fdf4', fontWeight: 700, color: '#166534' }} type="number" value={rvForm.total_revenue} onChange={e => setRvForm({ ...rvForm, total_revenue: e.target.value })} />
                        </FF>
                        <FF label={L('Ghi chú', 'Remarks')} span2>
                            <textarea style={{ ...inp, resize: 'vertical' }} rows="2" value={rvForm.remarks} onChange={e => setRvForm({ ...rvForm, remarks: e.target.value })} />
                        </FF>
                    </div>
                </ModalSlide>
            </>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const tabRenderers = {
        background: renderBackground,
        initial: renderInitialInvest,
        coffee: renderCoffeeCosts,
        intercrop: renderIntercropCosts,
        revenue: renderRevenue,
    };

    return (
        <div>
            {/* Sub-tab bar */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '16px', padding: '4px', background: '#f1f5f9', borderRadius: '12px', WebkitOverflowScrolling: 'touch' }}>
                {SUBTABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`mdv-tab-btn ${subTab === tab.id ? 'active' : ''}`}
                    >
                        <i className={`fas ${tab.icon} mdv-tab-icon`}></i>
                        {tab[appLang] || tab.vi}
                    </button>
                ))}
            </div>

            {/* Sub-tab content */}
            {tabRenderers[subTab]?.()}
        </div>
    );
};

export default ModelEconomics;
