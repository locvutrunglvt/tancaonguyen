import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';
import { translations } from './translations';

const FarmerManagement = ({ onBack, devUser, appLang = 'vi' }) => {
    const t = translations[appLang] || translations.vi;
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        area: '',
        members: ''
    });

    useEffect(() => {
        fetchFarmers();
    }, []);

    const fetchFarmers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('User')
                .select('*')
                .eq('role', 'Farmer')
                .order('created_at', { ascending: false });

            if (error) {
                // Try fallback to 'profiles' if 'User' doesn't exist
                const { data: profData, error: profError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'Farmer')
                    .order('created_at', { ascending: false });

                if (profError) throw profError;
                setFarmers(profData || []);
            } else {
                setFarmers(data || []);
            }
        } catch (e) {
            console.error('Error fetching farmers:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        const newFarmer = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'Farmer',
            organization: 'farmer',
            area: formData.area + ' ha',
            members: parseInt(formData.members) || 0,
            created_at: new Date().toISOString()
        };

        // Try 'User' table first
        let { error } = await supabase.from('User').insert([newFarmer]);

        if (error) {
            console.warn('Insert into User failed, trying profiles...', error);
            const { error: profError } = await supabase.from('profiles').insert([newFarmer]);
            error = profError;
        }

        if (error) {
            alert((t.save_error || 'Error: ') + error.message);
        } else {
            alert(t.save_success || 'Farmer registered successfully.');
            setShowModal(false);
            setFormData({ full_name: '', phone: '', area: '', members: '' });
            fetchFarmers();
        }
        setLoading(false);
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-add-user"
                    style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--tcn-dark)', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <i className="fas fa-user-plus"></i> {t.add.toUpperCase()} {t.farmers.toUpperCase()}
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3>{t.farmer_list_title}</h3>
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
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--coffee-medium)', cursor: 'pointer' }}><i className="fas fa-edit"></i></button>
                                            <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><i className="fas fa-trash"></i></button>
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
