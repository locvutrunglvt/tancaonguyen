import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations';
import MediaUpload from './MediaUpload';
import './Dashboard.css';

const ModelManagement = ({ onBack, devUser, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [models, setModels] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Detail View State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedModel, setSelectedModel] = useState(null);

    const [currentModel, setCurrentModel] = useState({
        farmer_id: '',
        farm_id: '',
        model_code: '',
        name: '',
        coffee_type: 'Robusta',
        variety: '',
        area: '',
        tree_count: '',
        planting_year: '',
        tree_age: '',
        location: '',
        adaptation_status: 'planning',
        last_inspection: '',
        notes: '',
        photo_url: ''
    });

    useEffect(() => {
        fetchFarmers();
        fetchModels();
    }, []);

    const fetchFarmers = async () => {
        try {
            const { data, error } = await supabase
                .from('farmers')
                .select('id, farmer_code, full_name, village')
                .eq('status', 'active')
                .order('full_name');

            if (error) throw error;
            setFarmers(data || []);
        } catch (e) {
            console.error('Error fetching farmers:', e.message);
        }
    };

    const fetchFarmsForFarmer = async (farmerId) => {
        if (!farmerId) {
            setFarms([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('farm_baselines')
                .select('id, farm_code, total_area, coffee_area')
                .eq('farmer_id', farmerId);

            if (error) throw error;
            setFarms(data || []);
        } catch (e) {
            console.error('Error fetching farms:', e.message);
        }
    };

    const fetchModels = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('coffee_models')
                .select(`
                    *,
                    farmer:farmers(farmer_code, full_name, village),
                    farm:farm_baselines(farm_code, total_area)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setModels(data || []);
        } catch (e) {
            console.error('Error fetching models:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFarmerChange = async (farmerId) => {
        setCurrentModel({ ...currentModel, farmer_id: farmerId, farm_id: '' });
        await fetchFarmsForFarmer(farmerId);
    };

    const handleEdit = (model) => {
        setCurrentModel({
            farmer_id: model.farmer_id,
            farm_id: model.farm_id || '',
            model_code: model.model_code,
            name: model.name,
            coffee_type: model.coffee_type || 'Robusta',
            variety: model.variety || '',
            area: model.area || '',
            tree_count: model.tree_count || '',
            planting_year: model.planting_year || '',
            tree_age: model.tree_age || '',
            location: model.location || '',
            adaptation_status: model.adaptation_status || 'planning',
            last_inspection: model.last_inspection || '',
            notes: model.notes || '',
            photo_url: model.photo_url || ''
        });
        setEditingId(model.id);
        setIsEditing(true);
        setShowModal(true);

        // Load farms for this farmer
        if (model.farmer_id) {
            fetchFarmsForFarmer(model.farmer_id);
        }
    };

    const handleView = (model) => {
        setSelectedModel(model);
        setShowDetailModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm(t.delete_confirm)) return;
        setLoading(true);
        const { error } = await supabase.from('coffee_models').delete().eq('id', id);
        if (error) {
            alert(t.delete_error + ': ' + error.message);
        } else {
            alert(t.delete_success);
            fetchModels();
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                farmer_id: currentModel.farmer_id,
                farm_id: currentModel.farm_id || null,
                name: currentModel.name,
                coffee_type: currentModel.coffee_type,
                variety: currentModel.variety,
                area: parseFloat(currentModel.area) || null,
                tree_count: parseInt(currentModel.tree_count) || null,
                planting_year: parseInt(currentModel.planting_year) || null,
                tree_age: parseInt(currentModel.tree_age) || null,
                location: currentModel.location,
                adaptation_status: currentModel.adaptation_status,
                last_inspection: currentModel.last_inspection || null,
                notes: currentModel.notes,
                photo_url: currentModel.photo_url
            };

            if (isEditing) {
                const { error } = await supabase
                    .from('coffee_models')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                alert(t.save_success);
            } else {
                const { error } = await supabase
                    .from('coffee_models')
                    .insert([payload]);

                if (error) throw error;
                alert(t.save_success);
            }

            handleModalClose();
            fetchModels();
        } catch (error) {
            alert(t.save_error + ': ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingId(null);
        setFarms([]);
        setCurrentModel({
            farmer_id: '',
            farm_id: '',
            model_code: '',
            name: '',
            coffee_type: 'Robusta',
            variety: '',
            area: '',
            tree_count: '',
            planting_year: '',
            tree_age: '',
            location: '',
            adaptation_status: 'planning',
            last_inspection: '',
            notes: '',
            photo_url: ''
        });
    };

    const canEdit = () => {
        if (!currentUser) return false;
        return currentUser.role === 'Admin';
    };

    const getStatusBadge = (status) => {
        const styles = {
            planning: { bg: '#fef3c7', color: '#92400e', text: t.model_status_planning },
            implementing: { bg: '#dbeafe', color: '#1e40af', text: t.model_status_implementing },
            monitoring: { bg: '#e0e7ff', color: '#4338ca', text: t.model_status_monitoring },
            completed: { bg: '#dcfce7', color: '#166534', text: t.model_status_completed },
            suspended: { bg: '#fee2e2', color: '#991b1b', text: t.model_status_suspended }
        };
        const style = styles[status] || styles.planning;
        return (
            <span style={{
                background: style.bg,
                color: style.color,
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
            }}>
                {style.text}
            </span>
        );
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setShowModal(true);
                    }}
                    className="btn-add-user"
                >
                    <i className="fas fa-plus"></i> {(t.model_add_btn || 'THÊM MÔ HÌNH').toUpperCase()}
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3><i className="fas fa-project-diagram" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.model_title}</h3>
                    <div className="badge">{models.length} {t.models?.toLowerCase()}</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>{t.farmer_code}</th>
                            <th>{t.model_name}</th>
                            <th>{t.coffee_type}</th>
                            <th>{t.model_area}</th>
                            <th>{appLang === 'vi' ? 'Tuổi cây' : appLang === 'en' ? 'Tree Age' : 'Klei mdréng kyâ'}</th>
                            <th>{t.adaptation_status}</th>
                            <th>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && models.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                        ) : models.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data}</td></tr>
                        ) : (
                            models.map(m => (
                                <tr key={m.id} onClick={() => handleView(m)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                    <td>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>
                                            {m.farmer?.farmer_code}
                                        </span>
                                        <div style={{ fontSize: '10px', opacity: 0.6 }}>{m.farmer?.full_name}</div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {m.photo_url && <img src={m.photo_url} alt="M" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />}
                                            {m.name}
                                        </div>
                                    </td>
                                    <td>{m.coffee_type}</td>
                                    <td>{m.area || '-'}</td>
                                    <td>{m.tree_age ? `${m.tree_age} ${appLang === 'vi' ? 'năm' : 'years'}` : '-'}</td>
                                    <td>{getStatusBadge(m.adaptation_status)}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {/* VIEW BUTTON (Always visible) */}
                                            <button onClick={() => handleView(m)} style={{
                                                background: '#e0f2fe', border: '1px solid #7dd3fc',
                                                color: '#0369a1', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }} title={t.details}>
                                                <i className="fas fa-eye"></i>
                                            </button>

                                            {canEdit() && (
                                                <>
                                                    <button onClick={() => handleEdit(m)} style={{
                                                        background: '#fef3c7', border: '1px solid #d97706',
                                                        color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }} title={t.edit}>
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(m.id)} style={{
                                                        background: '#fef2f2', border: '1px solid #ef4444',
                                                        color: '#b91c1c', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }} title={t.delete}>
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
                    <div className="modal-content" style={{ background: 'white', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <i className="fas fa-project-diagram" style={{ marginRight: '10px' }}></i>
                            {isEditing ? (t.update + ' ' + t.model_title?.toLowerCase()) : t.model_add_btn}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                {/* Column 1 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <h4 style={{ color: 'var(--coffee-dark)', fontSize: '14px', marginBottom: '5px', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.general_info}</h4>

                                    <div className="form-group">
                                        <label>{appLang === 'vi' ? 'Chọn nông dân' : appLang === 'en' ? 'Select Farmer' : 'Hriêng nông dân'} *</label>
                                        <select
                                            className="input-pro"
                                            required
                                            value={currentModel.farmer_id}
                                            onChange={e => handleFarmerChange(e.target.value)}
                                        >
                                            <option value="">-- {appLang === 'vi' ? 'Chọn nông dân' : appLang === 'en' ? 'Select Farmer' : 'Hriêng nông dân'} --</option>
                                            {farmers.map(f => (
                                                <option key={f.id} value={f.id}>
                                                    {f.farmer_code} - {f.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>{t.farm} ({t.optional})</label>
                                        <select
                                            className="input-pro"
                                            value={currentModel.farm_id}
                                            onChange={e => setCurrentModel({ ...currentModel, farm_id: e.target.value })}
                                            disabled={!currentModel.farmer_id}
                                        >
                                            <option value="">-- {t.no_selection} --</option>
                                            {farms.map(f => (
                                                <option key={f.id} value={f.id}>
                                                    {f.farm_code} - {f.total_area} ha
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>{t.model_name} *</label>
                                        <input className="input-pro" required value={currentModel.name} onChange={e => setCurrentModel({ ...currentModel, name: e.target.value })} placeholder={t.search_placeholder} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-group">
                                            <label>{t.coffee_type}</label>
                                            <select className="input-pro" value={currentModel.coffee_type} onChange={e => setCurrentModel({ ...currentModel, coffee_type: e.target.value })}>
                                                <option value="Robusta">Robusta</option>
                                                <option value="Arabica">Arabica</option>
                                                <option value="Mixed">{appLang === 'vi' ? 'Hỗn hợp' : 'Mixed'}</option>
                                                <option value="Other">{t.act_type_other}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{appLang === 'vi' ? 'Giống' : 'Variety'}</label>
                                            <input className="input-pro" value={currentModel.variety} onChange={e => setCurrentModel({ ...currentModel, variety: e.target.value })} placeholder="TR4, Catimor..." />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>{t.location}</label>
                                        <input className="input-pro" value={currentModel.location} onChange={e => setCurrentModel({ ...currentModel, location: e.target.value })} placeholder={t.location + '...'} />
                                    </div>
                                </div>

                                {/* Column 2 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <h4 style={{ color: 'var(--coffee-dark)', fontSize: '14px', marginBottom: '5px', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.act_detail}</h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-group">
                                            <label>{t.model_area}</label>
                                            <input className="input-pro" type="number" step="0.1" value={currentModel.area} onChange={e => setCurrentModel({ ...currentModel, area: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t.quantity} ({appLang === 'vi' ? 'cây' : 'trees'})</label>
                                            <input className="input-pro" type="number" value={currentModel.tree_count} onChange={e => setCurrentModel({ ...currentModel, tree_count: e.target.value })} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-group">
                                            <label>{appLang === 'vi' ? 'Năm trồng' : 'Planting Year'}</label>
                                            <input className="input-pro" type="number" min="1900" max="2100" value={currentModel.planting_year} onChange={e => setCurrentModel({ ...currentModel, planting_year: e.target.value })} placeholder="2020" />
                                        </div>
                                        <div className="form-group">
                                            <label>{appLang === 'vi' ? 'Tuổi cây' : 'Tree Age'}</label>
                                            <input className="input-pro" type="number" value={currentModel.tree_age} onChange={e => setCurrentModel({ ...currentModel, tree_age: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>{t.adaptation_status}</label>
                                        <select className="input-pro" value={currentModel.adaptation_status} onChange={e => setCurrentModel({ ...currentModel, adaptation_status: e.target.value })}>
                                            <option value="planning">{t.model_status_planning}</option>
                                            <option value="implementing">{t.model_status_implementing}</option>
                                            <option value="monitoring">{t.model_status_monitoring}</option>
                                            <option value="completed">{t.model_status_completed}</option>
                                            <option value="suspended">{t.model_status_suspended}</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>{appLang === 'vi' ? 'Ngày kiểm tra cuối' : 'Last Inspection'}</label>
                                        <input className="input-pro" type="date" value={currentModel.last_inspection} onChange={e => setCurrentModel({ ...currentModel, last_inspection: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>{t.notes}</label>
                                <textarea className="input-pro" rows="3" value={currentModel.notes} onChange={e => setCurrentModel({ ...currentModel, notes: e.target.value })} placeholder={t.notes + '...'}></textarea>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>{appLang === 'vi' ? 'Ảnh hồ sơ mô hình' : appLang === 'en' ? 'Model Profile Photo' : 'Ảnh mô hình'}</label>
                                <MediaUpload
                                    entityType="models"
                                    entityId={isEditing ? editingId : 'new'}
                                    currentUrl={currentModel.photo_url}
                                    onUploadSuccess={(url) => setCurrentModel({ ...currentModel, photo_url: url })}
                                    appLang={appLang}
                                />
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', gap: '15px', marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    <i className="fas fa-save"></i> {loading ? t.loading : (isEditing ? t.update.toUpperCase() : t.add.toUpperCase())}
                                </button>
                                <button type="button" className="btn-primary" style={{ background: '#f1f5f9', color: '#475569' }} onClick={handleModalClose}>
                                    <i className="fas fa-undo"></i> {t.cancel.toUpperCase()}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODEL DETAIL MODAL */}
            {showDetailModal && selectedModel && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px' }}>
                                <i className="fas fa-microscope" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                                {t.model_title}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        {selectedModel.photo_url && (
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <img src={selectedModel.photo_url} alt="Model" style={{ width: '100%', maxHeight: '250px', borderRadius: '15px', objectFit: 'cover' }} />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Section 1: Overview */}
                            <div className="detail-section" style={{ gridColumn: 'span 2' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.general_info}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.model_name}</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)' }}>{selectedModel.name}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer}</label>
                                <div style={{ fontWeight: 600 }}>{selectedModel.farmer?.full_name} ({selectedModel.farmer?.farmer_code})</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm}</label>
                                <div>{selectedModel.farm ? `${selectedModel.farm.farm_code} (${selectedModel.farm.total_area} ha)` : t.no_selection}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.adaptation_status}</label>
                                <div>{getStatusBadge(selectedModel.adaptation_status)}</div>
                            </div>

                            {/* Section 2: Technical */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.act_detail}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.coffee_type}</label>
                                <div>{selectedModel.coffee_type} {selectedModel.variety ? `- ${selectedModel.variety}` : ''}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.model_area}</label>
                                <div>{selectedModel.area} ha</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.quantity}</label>
                                <div>{selectedModel.tree_count} {appLang === 'vi' ? 'cây' : 'trees'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Mật độ' : 'Density'}</label>
                                <div>{selectedModel.area && selectedModel.tree_count ? Math.round(selectedModel.tree_count / selectedModel.area) : '---'} {appLang === 'vi' ? 'cây/ha' : 'trees/ha'}</div>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Năm trồng' : 'Planting Year'}</label>
                                <div>{selectedModel.planting_year || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Tuổi cây' : 'Tree Age'}</label>
                                <div>{selectedModel.tree_age ? `${selectedModel.tree_age} ${appLang === 'vi' ? 'năm' : 'years'}` : '---'}</div>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.location}</label>
                                <div>{selectedModel.location || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Kiểm tra lần cuối' : 'Last Inspection'}</label>
                                <div>{selectedModel.last_inspection ? new Date(selectedModel.last_inspection).toLocaleDateString(appLang === 'en' ? 'en-US' : 'vi-VN') : '---'}</div>
                            </div>

                            {selectedModel.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.notes}</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedModel.notes}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {canEdit() && (
                                    <>
                                        <button onClick={() => { setShowDetailModal(false); handleEdit(selectedModel); }} style={{
                                            background: '#fef3c7', border: '1px solid #d97706',
                                            color: '#92400e', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                                        }}>
                                            <i className="fas fa-pen"></i> {t.edit}
                                        </button>
                                        <button onClick={() => { setShowDetailModal(false); handleDelete(selectedModel.id); }} style={{
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

export default ModelManagement;
