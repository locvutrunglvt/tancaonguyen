import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';
import { translations } from './translations';

const FarmerManagement = ({ onBack, devUser, appLang = 'vi' }) => {
    const t = translations[appLang] || translations.vi;
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form state - only use fields that exist in profiles table
    const [formData, setFormData] = useState({
        full_name: '',
        phone: ''
    });

    useEffect(() => {
        fetchFarmers();
    }, []);

    const fetchFarmers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'Farmer')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFarmers(data || []);
        } catch (e) {
            console.error('Error fetching farmers:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (farmer) => {
        setFormData({
            full_name: farmer.full_name,
            phone: farmer.phone
        });
        setEditingId(farmer.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm(t.delete_confirm || 'Are you sure you want to delete this farmer?')) return;
        setLoading(true);
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
            alert((t.delete_error || 'Error: ') + error.message);
        } else {
            alert(t.delete_success || 'Deleted successfully.');
            fetchFarmers();
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (isEditing) {
            // Update existing farmer
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone
                })
                .eq('id', editingId);

            if (error) {
                alert((t.save_error || 'Error: ') + error.message);
            } else {
                alert(t.save_success || 'Updated successfully.');
                handleModalClose();
                fetchFarmers();
            }
        } else {
            // Create new farmer
            const newFarmer = {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                full_name: formData.full_name,
                phone: formData.phone,
                role: 'Farmer',
                organization: 'farmer',
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('profiles').insert([newFarmer]);

            if (error) {
                alert((t.save_error || 'Error: ') + error.message);
            } else {
                alert(t.save_success || 'Farmer registered successfully.');
                handleModalClose();
                fetchFarmers();
            }
        }
        setLoading(false);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({ full_name: '', phone: '' });
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setShowModal(true);
                    }}
                    className="btn-add-user"
                    style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--tcn-dark)', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <i className="fas fa-user-plus"></i> {t.add} {t.farmers}
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3><i className="fas fa-users" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.farmer_list_title}</h3>
                    <div className="badge">{farmers.length} {t.farmer_count}</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>{t.farmer_name}</th>
                            <th>{t.farmer_phone}</th>
                            <th>{t.farmer_area}</th>
                            <th>{t.farmer_members}</th>
                            <th>{t.reg_date}</th>
                            <th>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && farmers.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                        ) : farmers.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data}</td></tr>
                        ) : (
                            farmers.map(f => (
                                <tr key={f.id}>
                                    <td><div style={{ fontWeight: 700 }}>{f.full_name}</div></td>
                                    <td>{f.phone}</td>
                                    <td>{f.area || 'N/A'}</td>
                                    <td>{f.members || 'N/A'}</td>
                                    <td>{new Date(f.created_at).toLocaleDateString(appLang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEdit(f)} style={{
                                                background: '#fef3c7', border: '1px solid #d97706',
                                                color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }} title={t.edit || "Edit"}>
                                                <i className="fas fa-pen"></i>
                                            </button>
                                            <button onClick={() => handleDelete(f.id)} style={{
                                                background: '#fef2f2', border: '1px solid #ef4444',
                                                color: '#b91c1c', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }} title={t.delete || "Delete"}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '500px' }}>
                        <h3 style={{ marginBottom: '25px', color: 'var(--tcn-dark)' }}>{t.farmer_add_title}</h3>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-group">
                                    <label>{t.farmer_name}</label>
                                    <input className="input-pro" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder={t.enter_full_name || "Nhập tên đầy đủ"} />
                                </div>
                                <div className="form-group">
                                    <label>{t.farmer_phone}</label>
                                    <input className="input-pro" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="09xx xxx xxx" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>{t.farmer_area}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farmer_members}</label>
                                        <input className="input-pro" type="number" value={formData.members} onChange={e => setFormData({ ...formData, members: e.target.value })} />
                                    </div>
                                </div>
                                <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? t.loading : (t.save_btn || 'SAVE PROFILE')}</button>
                                    <button type="button" className="btn-primary" style={{ flex: 1, background: '#f1f5f9', color: '#475569' }} onClick={() => setShowModal(false)}>{t.cancel}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FarmerManagement;
