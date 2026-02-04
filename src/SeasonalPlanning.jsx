import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations';
import './Dashboard.css';

const SeasonalPlanning = ({ onBack, devUser, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [entries, setEntries] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Detail View State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);

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
            setEntries(data || []);
        } catch (err) {
            console.error('Error fetching financial records:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const totalCost = entries.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalRevenue = Math.abs(entries.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
    const profit = totalRevenue - totalCost;

    const formatCurrency = (val) => {
        if (isNaN(val) || val === undefined) return '0 ₫';
        return new Intl.NumberFormat(appLang === 'en' ? 'en-US' : 'vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(val);
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

        if (isEditing) {
            const { error } = await supabase
                .from('financial_records')
                .update(payload)
                .eq('id', editingId);

            if (error) {
                alert(t.save_error + ': ' + error.message);
            } else {
                alert(t.save_success);
                handleFormClose();
                fetchEntries();
            }
        } else {
            const { error } = await supabase
                .from('financial_records')
                .insert([payload]);

            if (error) {
                alert(t.save_error + ': ' + error.message);
            } else {
                alert(t.save_success);
                handleFormClose();
                fetchEntries();
            }
        }
        setIsLoading(false);
    };

    const handleEdit = (entry) => {
        setFormData({
            type: entry.category,
            date: entry.record_date,
            item: entry.item_name,
            amount: Math.abs(entry.amount),
            notes: entry.notes || ''
        });
        setIsEditing(true);
        setEditingId(entry.id);
        setShowForm(true);
    };

    const handleView = (entry) => {
        setSelectedEntry(entry);
        setShowDetailModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.delete_confirm)) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('financial_records').delete().eq('id', id);
            if (error) throw error;
            alert(t.delete_success);
            fetchEntries();
        } catch (error) {
            alert(`Error: ${error.message} `);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormClose = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            type: 'Chi phí',
            date: new Date().toISOString().split('T')[0],
            item: '',
            amount: '',
            notes: ''
        });
    };

    const canEdit = (entry) => {
        if (!currentUser) return false;
        return currentUser.role === 'Admin' || entry.user_id === currentUser.id;
    };

    const getCategoryText = (cat) => {
        if (cat === 'Chi phí') return t.fin_cost;
        if (cat === 'Doanh thu') return t.fin_revenue;
        return cat;
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                <button onClick={() => setShowForm(true)} className="btn-primary">
                    <i className="fas fa-plus"></i> {(t.fin_add_btn || 'THÊM BẢN GHI').toUpperCase()}
                </button>
            </div>

            {!showForm ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ background: '#fee2e2', padding: '15px', borderRadius: '15px', border: '2px solid #fca5a5' }}>
                            <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600, marginBottom: '5px' }}>{t.fin_cost}</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(totalCost)}</div>
                        </div>
                        <div style={{ background: '#d1fae5', padding: '15px', borderRadius: '15px', border: '2px solid #6ee7b7' }}>
                            <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 600, marginBottom: '5px' }}>{t.fin_revenue}</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>{formatCurrency(totalRevenue)}</div>
                        </div>
                        <div style={{ background: profit >= 0 ? '#dbeafe' : '#fef3c7', padding: '15px', borderRadius: '15px', border: `2px solid ${profit >= 0 ? '#93c5fd' : '#fcd34d'} ` }}>
                            <div style={{ fontSize: '11px', color: profit >= 0 ? '#1e40af' : '#92400e', fontWeight: 600, marginBottom: '5px' }}>{t.fin_profit}</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: profit >= 0 ? '#2563eb' : '#d97706' }}>{formatCurrency(profit)}</div>
                        </div>
                    </div>

                    <div className="data-table-container">
                        <div className="table-header">
                            <h3><i className="fas fa-coins" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.fin_title}</h3>
                            <div className="badge">{entries.length} {t.financial_records?.toLowerCase()}</div>
                        </div>

                        <table className="pro-table">
                            <thead>
                                <tr>
                                    <th>{t.date}</th>
                                    <th>{t.fin_category}</th>
                                    <th>{t.fin_item}</th>
                                    <th>{t.fin_amount}</th>
                                    <th>{t.notes}</th>
                                    <th>{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data}</td></tr>
                                ) : (
                                    entries.map(entry => (
                                        <tr key={entry.id} onClick={() => handleView(entry)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                            <td>{entry.record_date}</td>
                                            <td>
                                                <span className="badge-org" style={{ background: entry.amount < 0 ? '#d1fae5' : '#fee2e2' }}>
                                                    {getCategoryText(entry.category)}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{entry.item_name}</td>
                                            <td style={{ color: entry.amount < 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>
                                                {formatCurrency(Math.abs(entry.amount))}
                                            </td>
                                            <td>{entry.notes || '-'}</td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {/* VIEW BUTTON (Always visible) */}
                                                    <button onClick={() => handleView(entry)} style={{
                                                        background: '#e0f2fe', border: '1px solid #7dd3fc',
                                                        color: '#0369a1', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }} title={t.details}>
                                                        <i className="fas fa-eye"></i>
                                                    </button>

                                                    {(canEdit(entry)) && (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={() => handleEdit(entry)} className="btn-primary" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }} title={t.edit}>
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button onClick={() => handleDelete(entry.id)} className="btn-primary" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }} title={t.delete}>
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-coins"></i> {isEditing ? (t.update + ' ' + t.financial_records?.toLowerCase()) : t.fin_form_title}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{t.fin_category}</label>
                                <select className="input-pro" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} required>
                                    <option value="Chi phí">{t.fin_cost}</option>
                                    <option value="Doanh thu">{t.fin_revenue}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t.date}</label>
                                <input className="input-pro" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.fin_item}</label>
                            <input className="input-pro" value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })} required placeholder={t.search_placeholder} />
                        </div>

                        <div className="form-group">
                            <label>{t.fin_amount} (VND)</label>
                            <input className="input-pro" type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required placeholder="1,000,000" />
                        </div>

                        <div className="form-group">
                            <label>{t.notes}</label>
                            <textarea className="input-pro" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows="3" placeholder={t.notes + '...'}></textarea>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading}>
                                <i className="fas fa-save"></i> {isLoading ? t.loading : (isEditing ? t.update.toUpperCase() : t.save.toUpperCase())}
                            </button>
                            <button type="button" className="btn-primary" onClick={handleFormClose} style={{ background: '#f1f5f9', color: '#475569' }}>
                                <i className="fas fa-undo"></i> {t.cancel.toUpperCase()}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* DETAIL MODAL */}
            {showDetailModal && selectedEntry && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px' }}>
                                <i className="fas fa-info-circle" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                                {t.plan_group}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.date}</label>
                                <div style={{ fontWeight: 600 }}>{new Date(selectedEntry.record_date).toLocaleDateString(appLang === 'en' ? 'en-US' : 'vi-VN')}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.fin_category}</label>
                                <div>
                                    <span className="badge-org" style={{ background: selectedEntry.amount < 0 ? '#d1fae5' : '#fee2e2' }}>
                                        {getCategoryText(selectedEntry.category)}
                                    </span>
                                </div>
                            </div>

                            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.fin_item}</label>
                                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{selectedEntry.item_name}</div>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.fin_amount}</label>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: selectedEntry.amount < 0 ? '#059669' : '#dc2626' }}>
                                    {formatCurrency(Math.abs(selectedEntry.amount))}
                                </div>
                            </div>

                            {selectedEntry.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.notes}</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedEntry.notes}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {canEdit(selectedEntry) && (
                                    <>
                                        <button onClick={() => { setShowDetailModal(false); handleEdit(selectedEntry); }} style={{
                                            background: '#fef3c7', border: '1px solid #d97706',
                                            color: '#92400e', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                                        }}>
                                            <i className="fas fa-edit"></i> {t.edit}
                                        </button>
                                        <button onClick={() => { setShowDetailModal(false); handleDelete(selectedEntry.id); }} style={{
                                            background: '#fef2f2', border: '1px solid #ef4444',
                                            color: '#b91c1c', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                                        }}>
                                            <i className="fas fa-trash"></i> {t.delete}
                                        </button>
                                    </>
                                )}
                            </div>
                            <button onClick={() => setShowDetailModal(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
                                {t.close}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeasonalPlanning;
