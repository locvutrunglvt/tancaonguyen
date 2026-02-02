import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations';
import './Dashboard.css';

const SeasonalPlanning = ({ onBack, devUser, appLang = 'vi' }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [entries, setEntries] = useState([]);
    const [formData, setFormData] = useState({
        type: 'Chi phí',
        date: new Date().toISOString().split('T')[0],
        item: '',
        amount: '',
        notes: ''
    });

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('financial_records')
                .select('*')
                .order('record_date', { ascending: false });

            if (error) throw error;
            const mapped = (data || []).map(d => ({
                id: d.id,
                category: d.category || 'Cost',
                item: d.item_name || 'Unnamed',
                cost: d.amount || 0,
                date: d.record_date || ''
            }));
            setEntries(mapped);
        } catch (err) {
            console.error('Error fetching financial records:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const totalCost = entries.filter(e => e.cost > 0).reduce((sum, e) => sum + e.cost, 0);
    const totalRevenue = Math.abs(entries.filter(e => e.cost < 0).reduce((sum, e) => sum + e.cost, 0));
    const profit = totalRevenue - totalCost;

    const formatCurrency = (val) => {
        if (isNaN(val) || val === undefined) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || devUser?.id;

        let amountVal = parseInt(formData.amount) || 0;
        if (formData.type === 'Doanh thu') {
            amountVal = -Math.abs(amountVal);
        } else {
            amountVal = Math.abs(amountVal);
        }

        const payload = {
            user_id: userId,
            record_date: formData.date,
            category: formData.type,
            item_name: formData.item,
            amount: amountVal,
            notes: formData.notes
        };

        const { error } = await supabase
            .from('financial_records')
            .insert([payload]);

        if (error) {
            alert(t.save_error || 'Error: ' + error.message);
        } else {
            alert(t.save_success || 'Saved successfully.');
            setShowForm(false);
            fetchEntries();
        }
        setIsLoading(false);
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                    <i className="fas fa-file-invoice-dollar"></i> {t.plan_add_btn}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div className="kpi-card" style={{ background: 'white', padding: '20px', borderRadius: '20px', borderLeft: '5px solid #ef4444' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>{t.plan_total_cost}</p>
                    <h3 style={{ color: '#b91c1c' }}>{formatCurrency(totalCost)}</h3>
                </div>
                <div className="kpi-card" style={{ background: 'white', padding: '20px', borderRadius: '20px', borderLeft: '5px solid #22c55e' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>{t.plan_total_rev}</p>
                    <h3 style={{ color: '#15803d' }}>{formatCurrency(totalRevenue)}</h3>
                </div>
                <div className="kpi-card" style={{ background: 'white', padding: '20px', borderRadius: '20px', borderLeft: '5px solid #3b82f6', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.1)' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>{t.plan_profit}</p>
                    <h3 style={{ color: '#1d4ed8' }}>{formatCurrency(profit)}</h3>
                </div>
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3><i className="fas fa-coins" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.plan_title}</h3>
                        <div className="badge">{t.plan_group}</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>{t.plan_date || 'Date'}</th>
                                <th>{t.plan_cat || 'Category'}</th>
                                <th>{t.act_detail || 'Detail'}</th>
                                <th>{t.plan_amount || 'Amount'}</th>
                                <th>{t.actions || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.5 }}>{t.loading}</td></tr>
                            ) : entries.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data || 'No records found'}</td></tr>
                            ) : (
                                entries.map(e => (
                                    <tr key={e.id}>
                                        <td>{e.date}</td>
                                        <td>
                                            <span className="badge" style={{
                                                background: (e.category === 'Doanh thu' || e.category === 'Revenue') ? '#ecfdf5' : '#f8fafc',
                                                color: (e.category === 'Doanh thu' || e.category === 'Revenue') ? '#059669' : '#64748b'
                                            }}>
                                                {(e.category === 'Doanh thu' || e.category === 'Revenue') ? (t.plan_cats?.revenue || 'Revenue') : (t.plan_cats?.cost || 'Cost')}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{e.item}</td>
                                        <td style={{ color: e.cost < 0 ? '#059669' : '#b91c1c', fontWeight: 700 }}>
                                            {e.cost < 0 ? '+' : '-'}{formatCurrency(Math.abs(e.cost))}
                                        </td>
                                        <td>
                                            <button onClick={() => { }} style={{
                                                background: '#fef2f2', border: '1px solid #fecaca',
                                                color: '#ef4444', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px'
                                            }} title={t.delete || "Delete"}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-plus-circle"></i> {t.plan_form_title}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{t.plan_type}</label>
                                <select className="input-pro" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="Chi phí">{t.plan_cats?.cost || 'Cost'}</option>
                                    <option value="Doanh thu">{t.plan_cats?.revenue || 'Revenue'}</option>
                                    <option value="Đầu tư">{t.plan_cats?.investment || 'Investment'}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t.plan_date}</label>
                                <input type="date" className="input-pro" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{t.act_detail}</label>
                                <input className="input-pro" required value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })} placeholder={t.plan_placeholder} />
                            </div>
                            <div className="form-group">
                                <label>{t.plan_amount} (VNĐ)</label>
                                <input type="number" className="input-pro" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label>{t.notes || 'Notes'}</label>
                                <input className="input-pro" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="..." />
                            </div>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>
                                <i className="fas fa-save"></i> {isLoading ? t.loading : t.save}
                            </button>
                            <button type="button" className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                                {t.cancel}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default SeasonalPlanning;
