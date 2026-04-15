/**
 * ExportExcelDialog.jsx
 * Modal for exporting farm economics data to Excel:
 *  - Form 1 (260311): Per-model, 3 sheets (Năm đầu tiên / Cà phê / Trồng xen)
 *  - Form 2 (260323): Consolidated, 4 sheets across all models
 */
import React, { useState, useEffect } from 'react';
import pb from '../pbClient';
import { translations } from '../translations';
import { exportModelExcel, exportConsolidatedExcel } from '../utils/excelExportUtils';

const inp = {
    width: '100%', padding: '9px 11px', border: '1.5px solid #e2e8f0',
    borderRadius: '9px', fontSize: '13px', background: '#f8fafc',
    outline: 'none', boxSizing: 'border-box',
};
const sel = { ...inp, appearance: 'auto' };

const ExportExcelDialog = ({ show, onClose, currentUser }) => {
    const [appLang, setAppLang] = useState(localStorage.getItem('app_lang') || 'vi');
    const t = translations[appLang] || translations.vi;
    const L = (vi, en, ede) =>
        appLang === 'en' ? en : appLang === 'ede' ? (ede || vi) : vi;

    const [formType, setFormType] = useState('form1'); // 'form1' | 'form2'
    const [models, setModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (show) loadModels();
    }, [show]);

    const loadModels = async () => {
        setLoading(true);
        setError('');
        try {
            // Try demo_models first, fall back to coffee_models
            let records = [];
            try {
                records = await pb.collection('demo_models').getFullList({
                    sort: 'name', expand: 'farmer_id',
                });
            } catch {
                records = await pb.collection('coffee_models').getFullList({
                    sort: 'name', expand: 'farmer_id',
                });
            }
            setModels(records);
            if (records.length > 0) setSelectedModelId(records[0].id);
        } catch (e) {
            setError(L('Không thể tải danh sách mô hình', 'Cannot load model list') + ': ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        setError('');
        try {
            if (formType === 'form1') {
                await exportForm1();
            } else {
                await exportForm2();
            }
        } catch (e) {
            setError(L('Lỗi khi xuất Excel', 'Excel export error') + ': ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    // ── Export Form 1: Single model, 3 sheets ─────────────────────────────────
    const exportForm1 = async () => {
        const model = models.find(m => m.id === selectedModelId);
        if (!model) throw new Error(L('Vui lòng chọn mô hình', 'Please select a model'));

        const filterBase = `model_id='${model.id}'`;
        const yearFilter = `crop_year=${selectedYear}`;

        const [ii, cc, ic, rv] = await Promise.all([
            pb.collection('initial_investment').getFullList({ filter: filterBase, sort: '-record_date' }),
            pb.collection('coffee_cost_entries').getFullList({ filter: `${filterBase} && ${yearFilter}`, sort: '-record_date' }),
            pb.collection('intercrop_cost_entries').getFullList({ filter: `${filterBase} && ${yearFilter}`, sort: '-record_date' }),
            pb.collection('revenue_entries').getFullList({ filter: `model_id='${model.id}'`, sort: '-sale_date' }),
        ]);

        const farmerName = model.expand?.farmer_id?.full_name || model.name || 'Model';
        const iiLabor = ii.filter(r => r.investment_type === 'Labour');
        const iiInput = ii.filter(r => r.investment_type === 'Input');

        await exportModelExcel({
            model,
            farmerName,
            initialLabor: iiLabor,
            initialInput: iiInput,
            coffeeLabor: cc.filter(r => r.cost_type === 'Labour'),
            coffeeInputs: cc.filter(r => r.cost_type !== 'Labour'),
            icLabor: ic.filter(r => r.cost_type === 'Labour'),
            icInputs: ic.filter(r => r.cost_type !== 'Labour'),
            coffeeRevenues: rv.filter(r => r.revenue_source === 'Coffee'),
            icRevenues: rv.filter(r => r.revenue_source === 'Intercrop'),
        });
    };

    // ── Export Form 2: All models consolidated ────────────────────────────────
    const exportConsolidated = async () => {
        const [models2, bgs, iis, ccs, ics, rvs] = await Promise.all([
            models.length > 0 ? Promise.resolve(models) : loadModels(),
            pb.collection('farm_background').getFullList({ sort: '-year' }).catch(() => []),
            pb.collection('initial_investment').getFullList({ sort: '-record_date' }).catch(() => []),
            pb.collection('coffee_cost_entries').getFullList({ sort: '-record_date' }).catch(() => []),
            pb.collection('intercrop_cost_entries').getFullList({ sort: '-record_date' }).catch(() => []),
            pb.collection('revenue_entries').getFullList({ sort: '-sale_date' }).catch(() => []),
        ]);

        await exportConsolidatedExcel({
            models: models2,
            farmBackgrounds: bgs,
            initialInvestments: iis,
            coffeeCosts: ccs,
            icCosts: ics,
            revenues: rvs,
        });
    };

    const exportForm2 = exportConsolidated;

    if (!show) return null;

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
                animation: 'slideUp 0.25s ease',
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--coffee-dark), var(--coffee-primary))',
                    padding: '20px 24px', color: 'white',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                                <i className="fas fa-file-excel" style={{ marginRight: '8px', opacity: 0.9 }}></i>
                                {L('Xuất Excel', 'Export Excel')}
                            </h3>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.75 }}>
                                {L('Xuất báo cáo kinh tế nông trại ra file Excel', 'Export farm economics report to Excel file')}
                            </p>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px',
                            color: 'white', fontSize: '18px', cursor: 'pointer', padding: '8px 12px',
                        }}><i className="fas fa-times"></i></button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px' }}>

                    {/* Form Type Selector */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                            {L('Chọn mẫu báo cáo', 'Select Report Template')}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                onClick={() => setFormType('form1')}
                                style={{
                                    padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                                    border: `2px solid ${formType === 'form1' ? 'var(--coffee-primary)' : '#e2e8f0'}`,
                                    background: formType === 'form1' ? '#f0fdf4' : 'white',
                                    color: formType === 'form1' ? '#166534' : '#64748b',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <i className="fas fa-file-alt" style={{ display: 'block', marginBottom: '6px', fontSize: '18px' }}></i>
                                {L('Mẫu 1', 'Form 1')}<br />
                                <span style={{ fontWeight: 400, fontSize: '10px' }}>260311 – Demo</span>
                            </button>
                            <button
                                onClick={() => setFormType('form2')}
                                style={{
                                    padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                                    border: `2px solid ${formType === 'form2' ? 'var(--coffee-primary)' : '#e2e8f0'}`,
                                    background: formType === 'form2' ? '#f0fdf4' : 'white',
                                    color: formType === 'form2' ? '#166534' : '#64748b',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <i className="fas fa-layer-group" style={{ display: 'block', marginBottom: '6px', fontSize: '18px' }}></i>
                                {L('Mẫu 2', 'Form 2')}<br />
                                <span style={{ fontWeight: 400, fontSize: '10px' }}>260323 – Tổng hợp</span>
                            </button>
                        </div>
                    </div>

                    {/* Form 1 options */}
                    {formType === 'form1' && (
                        <>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                                    {L('Chọn mô hình', 'Select Model')}
                                </label>
                                <select style={sel} value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}>
                                    {models.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.expand?.farmer_id?.full_name || m.name || m.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                                    {L('Năm', 'Year')}
                                </label>
                                <select style={sel} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            <div style={{
                                background: '#f8fafc', borderRadius: '10px', padding: '12px',
                                border: '1px solid #e2e8f0', marginBottom: '12px',
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    📋 {L('Mẫu 1 – Chỉ tiêu Demo (260311)', 'Form 1 – Demo Indicators (260311)')}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                                    {L('3 sheet: Năm đầu tiên / Cà phê / Trồng xen', '3 sheets: Initial Year / Coffee / Intercrop')}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Form 2 options */}
                    {formType === 'form2' && (
                        <div style={{
                            background: '#f8fafc', borderRadius: '10px', padding: '12px',
                            border: '1px solid #e2e8f0', marginBottom: '12px',
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                📋 {L('Mẫu 2 – Tổng hợp kinh tế (260323)', 'Form 2 – Consolidated Economics (260323)')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                                {L('4 sheet: THÔNG TIN VƯỜN / CHI PHÍ CÀ PHÊ / CHI PHÍ TRỒNG XEN / DOANH THU', '4 sheets: FARM INFO / COFFEE COSTS / INTERCROP COSTS / REVENUE')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#059669', marginTop: '6px', fontWeight: 600 }}>
                                <i className="fas fa-info-circle"></i> {L('Xuất tất cả mô hình vào 1 file', 'Exports all models into 1 file')}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '9px', padding: '10px 12px', color: '#dc2626', fontSize: '12px', marginBottom: '12px' }}>
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}

                    {/* Progress/Loading */}
                    {exporting && (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '13px' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '20px', marginBottom: '8px', display: 'block', color: 'var(--coffee-primary)' }}></i>
                            {L('Đang xuất Excel...', 'Exporting Excel...')}
                        </div>
                    )}

                    {!exporting && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button onClick={onClose} style={{
                                flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '11px',
                                background: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#64748b',
                            }}>
                                {L('Hủy', 'Cancel')}
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={loading || (formType === 'form1' && !selectedModelId)}
                                style={{
                                    flex: 2, padding: '12px', border: 'none', borderRadius: '11px',
                                    background: 'var(--coffee-primary)', color: 'white', fontSize: '13px', fontWeight: 700,
                                    cursor: (loading || (formType === 'form1' && !selectedModelId)) ? 'wait' : 'pointer',
                                    opacity: (loading || (formType === 'form1' && !selectedModelId)) ? 0.6 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                }}
                            >
                                <i className="fas fa-file-export"></i>
                                {loading ? L('Đang tải...', 'Loading...') : L('Xuất Excel', 'Export Excel')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer note */}
                <div style={{ padding: '0 24px 16px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                    <i className="fas fa-file-excel" style={{ color: '#059669' }}></i>
                    {' '}SheetJS · {L('File sẽ tải về tự động', 'File will download automatically')}
                </div>
            </div>
        </div>
    );
};

export default ExportExcelDialog;
