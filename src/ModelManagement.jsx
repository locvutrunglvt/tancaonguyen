import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations';
import './Dashboard.css';

const ModelManagement = ({ onBack, devUser, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [currentModel, setCurrentModel] = useState({
        name: '',
        location: '',
        coffee_type: 'Robusta',
        area: '',
        adaptation_status: 'Planning',
        last_inspection: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('coffee_models').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setModels(data || []);
        } catch (e) {
            console.error('Error fetching models:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (model) => {
        setCurrentModel({
            name: model.name,
            location: model.location,
            coffee_type: model.coffee_type,
            area: model.area,
            adaptation_status: model.adaptation_status,
            last_inspection: model.last_inspection || new Date().toISOString().split('T')[0]
        });
        setEditingId(model.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm(t.delete_confirm || 'Are you sure you want to delete this model?')) return;
        setLoading(true);
        const { error } = await supabase.from('coffee_models').delete().eq('id', id);
        if (error) {
            alert((t.delete_error || 'Error: ') + error.message);
        } else {
            alert(t.delete_success || 'Deleted successfully.');
            fetchModels();
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || devUser?.id;

        if (isEditing) {
            const { error } = await supabase
                .from('coffee_models')
                .update(currentModel)
                .eq('id', editingId);

            if (error) alert(error.message);
            else {
                alert(t.save_success || 'Updated successfully.');
                handleModalClose();
                fetchModels();
            }
        } else {
            const { error } = await supabase.from('coffee_models').insert([{
                ...currentModel,
                user_id: userId
            }]);

            if (error) alert(error.message);
            else {
                alert(t.save_success || 'Saved successfully.');
                handleModalClose();
                fetchModels();
            }
        }
        setLoading(false);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingId(null);
        setCurrentModel({
            name: '',
            location: '',
            coffee_type: 'Robusta',
            area: '',
            adaptation_status: 'Planning',
            last_inspection: new Date().toISOString().split('T')[0]
        });
    };

    const canEdit = () => {
        if (!currentUser) return false;
        return currentUser.role === 'Admin';
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
                    <i className="fas fa-plus"></i> {t.model_add_btn}
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3><i className="fas fa-project-diagram" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.model_title}</h3>
                    <div className="badge">{models.length} {t.model?.toLowerCase() || 'models'}</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>{t.model_name}</th>
                            <th>{t.model_loc}</th>
                            <th>{t.model_coffee_type}</th>
                            <th>{t.model_area}</th>
                            <th>{t.model_status}</th>
                            <th>{t.model_last_inspection || 'Last Inspection'}</th>
                            <th>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && models.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                        ) : models.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', opacity: 0.5 }}>{t.loading}</td></tr>
                        ) : (
                            models.map(m => (
                                <tr key={m.id}>
                                    <td><div style={{ fontWeight: 700 }}>{m.name}</div></td>
                                    <td>{m.location}</td>
                                    <td>{m.coffee_type}</td>
                                    <td>{m.area} ha</td>
                                    <td>
                                        <span className={`role-badge role-${m.adaptation_status?.toLowerCase()}`} style={{ background: m.adaptation_status === 'Active' ? '#dcfce7' : '#f1f5f9', color: m.adaptation_status === 'Active' ? '#166534' : '#475569' }}>
                                            {m.adaptation_status}
                                        </span>
                                    </td>
                                    <td>{m.last_inspection || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {canEdit() && (
                                                <>
                                                    <button onClick={() => handleEdit(m)} style={{
                                                        background: 'var(--tcn-light)', border: '1px solid var(--tcn-primary)',
                                                        color: 'var(--tcn-dark)', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px'
                                                    }} title={t.edit || "Edit"}>
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(m.id)} style={{
                                                        background: '#fef2f2', border: '1px solid #fecaca',
                                                        color: '#ef4444', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px'
                                                    }} title={t.delete || "Delete"}>
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </>
                                            )}
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
                    <div className="modal-content" style={{ background: 'white', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '600px' }}>
                        <h3 style={{ marginBottom: '25px', color: 'var(--tcn-dark)' }}>{t.model_setup_title}</h3>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-group">
                                    <label>{t.model_name}</label>
                                    <input className="input-pro" required value={currentModel.name} onChange={e => setCurrentModel({ ...currentModel, name: e.target.value })} placeholder="VD: Model 01..." />
                                </div>
                                <div className="form-group">
                                    <label>{t.model_loc}</label>
                                    <input className="input-pro" value={currentModel.location} onChange={e => setCurrentModel({ ...currentModel, location: e.target.value })} placeholder="Xã, Huyện, Tỉnh" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>{t.model_coffee_type}</label>
                                        <select className="input-pro" value={currentModel.coffee_type} onChange={e => setCurrentModel({ ...currentModel, coffee_type: e.target.value })}>
                                            <option>Robusta</option>
                                            <option>Arabica</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t.model_area} (ha)</label>
                                        <input className="input-pro" type="number" step="0.1" value={currentModel.area} onChange={e => setCurrentModel({ ...currentModel, area: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>{t.model_status || 'Adaptation Status'}</label>
                                        <select className="input-pro" value={currentModel.adaptation_status} onChange={e => setCurrentModel({ ...currentModel, adaptation_status: e.target.value })}>
                                            <option value="Planning">Planning</option>
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t.model_last_inspection || 'Last Inspection'}</label>
                                        <input className="input-pro" type="date" value={currentModel.last_inspection} onChange={e => setCurrentModel({ ...currentModel, last_inspection: e.target.value })} />
                                    </div>
                                </div>
                                <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? t.loading : t.save}</button>
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

export default ModelManagement;
