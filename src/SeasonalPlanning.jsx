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

        if (isEditing) {
            const { error } = await supabase
                .from('financial_records')
                .update(payload)
                .eq('id', editingId);

            if (error) {
                alert(t.save_error || 'Error: ' + error.message);
            } else {
                alert(t.save_success || 'Updated successfully.');
                handleFormClose();
                fetchEntries();
            }
        } else {
            const { error } = await supabase
                .from('financial_records')
                .insert([payload]);

            if (error) {
                alert(t.save_error || 'Error: ' + error.message);
            } else {
                alert(t.save_success || 'Saved successfully.');
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

    const handleDelete = async (id) => {
        if (!window.confirm(t.act_confirm_delete || 'Xác nhận xóa?')) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('financial_records').delete().eq('id', id);
            if (error) throw error;
            alert(t.delete_success || 'Deleted successfully.');
            fetchEntries();
        } catch (error) {
            alert(`DELETE_ERROR: ${error.message}`);
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

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                    <i className="fas fa-plus"></i> {t.fin_add_btn || 'Add Record'}
                </button>
            </div>

            {!showForm ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ background: '#fee2e2', padding: '15px', borderRadius: '15px', border: '2px solid #fca5a5' }}>
                            <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600, marginBottom: '5px' }}>{t.fin_cost || 'Total Cost'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(totalCost)}</div>
                        </div>
                        <div style={{ background: '#d1fae5', padding: '15px', borderRadius: '15px', border: '2px solid #6ee7b7' }}>
                            <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 600, marginBottom: '5px' }}>{t.fin_revenue || 'Total Revenue'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>{formatCurrency(totalRevenue)}</div>
                        </div>
                        <div style={{ background: profit >= 0 ? '#dbeafe' : '#fef3c7', padding: '15px', borderRadius: '15px', border: `2px solid ${profit >= 0 ? '#93c5fd' : '#fcd34d'}` }}>
                            <div style={{ fontSize: '11px', color: profit >= 0 ? '#1e40af' : '#92400e', fontWeight: 600, marginBottom: '5px' }}>{t.fin_profit || 'Profit'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: profit >= 0 ? '#2563eb' : '#d97706' }}>{formatCurrency(profit)}</div>
                        </div>
                    </div>

                    <div className="data-table-container">
                        <div className="table-header">
                            <h3><i className="fas fa-coins" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.fin_title || 'Financial Records'}</h3>
                            <div className="badge">{entries.length} {t.act_count || 'records'}</div>
                        </div>

                        <table className="pro-table">
                            <thead>
                                <tr>
                                    <th>{t.fin_date || 'Date'}</th>
                                    <th>{t.fin_category || 'Category'}</th>
                                    <th>{t.fin_item || 'Item'}</th>
                                    <th>{t.fin_amount || 'Amount'}</th>
                                    <th>{t.fin_notes || 'Notes'}</th>
                                    <th>{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <tr key={entry.id}>
                                        <td>{entry.record_date}</td>
                                        <td>
                                            <span className="badge-org" style={{ background: entry.amount < 0 ? '#d1fae5' : '#fee2e2' }}>
                                                {entry.category}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{entry.item_name}</td>
                                        <td style={{ color: entry.amount < 0 ? '#059669' : '#dc2626', fontWeight: 700 }}>
                                            {formatCurrency(Math.abs(entry.amount))}
                                        </td>
                                        <td>{entry.notes || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {canEdit(entry) && (
                                                    <>
                                                        <button onClick={() => handleEdit(entry)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }} title="Edit">
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(entry.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete">
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-coins"></i> {isEditing ? (t.edit || 'Edit') : (t.fin_form_title || 'Add Financial Record')}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{t.fin_category || 'Category'}</label>
                                <select className="input-pro" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} required>
                                    <option value="Chi phí">Chi phí</option>
                                    <option value="Doanh thu">Doanh thu</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t.fin_date || 'Date'}</label>
                                <input className="input-pro" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.fin_item || 'Item'}</label>
                            <input className="input-pro" value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })} required />
                        </div>

                        <div className="form-group">
                            <label>{t.fin_amount || 'Amount (VND)'}</label>
                            <input className="input-pro" type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                        </div>

                        <div className="form-group">
                            <label>{t.fin_notes || 'Notes'}</label>
                            <textarea className="input-pro" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows="3"></textarea>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>
                                <i className="fas fa-check"></i> {isLoading ? t.loading : t.confirm}
                            </button>
                            <button type="button" className="btn-primary" onClick={handleFormClose} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
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
