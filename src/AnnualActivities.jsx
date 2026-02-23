import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { isGCPCompliant } from './agronomyUtils';
import { translations } from './translations';
import MediaUpload from './MediaUpload';
import './Dashboard.css';

const AnnualActivities = ({ onBack, devUser, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [logs, setLogs] = useState([]);
    const [models, setModels] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Detail View State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);

    const [formData, setFormData] = useState({
        model_id: '',
        activity_date: new Date().toISOString().split('T')[0],
        activity_type: 'fertilizer',
        description: '',
        // For fertilizer/pesticide
        material_name: '',
        amount: '',
        unit: 'kg/gốc',
        gcp_compliant: true,
        phi_days: '',
        // For tree_support
        tree_species: '',
        tree_quantity: '',
        tree_quality: 'good',
        survival_rate: '',
        estimated_value: '',
        // Common
        reason: '',
        notes: '',
        media_url: ''
    });

    const [gcpWarning, setGcpWarning] = useState(false);

    useEffect(() => {
        fetchModels();
        fetchLogs();
    }, []);

    const fetchModels = async () => {
        try {
            const data = await pb.collection('coffee_models').getFullList({ expand: 'farmer_id', sort: '-created' });
            setModels(data || []);
        } catch (err) {
            console.error('Error fetching models:', err.message);
        }
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await pb.collection('annual_activities').getFullList({ expand: 'model_id,model_id.farmer_id', sort: '-activity_date' });
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMaterialChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, material_name: val });
        if (formData.activity_type === 'pesticide') {
            const isCompliant = isGCPCompliant(val);
            setGcpWarning(!isCompliant);
            setFormData({ ...formData, material_name: val, gcp_compliant: isCompliant });
        } else {
            setGcpWarning(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                model_id: formData.model_id,
                activity_date: formData.activity_date,
                activity_type: formData.activity_type,
                description: formData.description,
                reason: formData.reason,
                notes: formData.notes,
                media_url: formData.media_url
            };

            // Add type-specific fields
            if (['fertilizer', 'pesticide'].includes(formData.activity_type)) {
                payload.material_name = formData.material_name;
                payload.amount = parseFloat(formData.amount) || null;
                payload.unit = formData.unit;

                if (formData.activity_type === 'pesticide') {
                    payload.gcp_compliant = formData.gcp_compliant;
                    payload.phi_days = parseInt(formData.phi_days) || null;
                }
            }

            if (formData.activity_type === 'tree_support') {
                payload.tree_species = formData.tree_species;
                payload.tree_quantity = parseInt(formData.tree_quantity) || null;
                payload.tree_quality = formData.tree_quality;
                payload.survival_rate = parseFloat(formData.survival_rate) || null;
                payload.estimated_value = parseFloat(formData.estimated_value) || null;
            }

            if (isEditing) {
                await pb.collection('annual_activities').update(editingId, payload);
                alert(t.save_success);
            } else {
                await pb.collection('annual_activities').create(payload);
                alert(t.save_success);
            }

            handleFormClose();
            fetchLogs();
        } catch (error) {
            alert((t.save_error || 'Error: ') + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (log) => {
        setFormData({
            model_id: log.model_id,
            activity_date: log.activity_date,
            activity_type: log.activity_type,
            description: log.description || '',
            material_name: log.material_name || '',
            amount: log.amount || '',
            unit: log.unit || 'kg/gốc',
            gcp_compliant: log.gcp_compliant !== false,
            phi_days: log.phi_days || '',
            tree_species: log.tree_species || '',
            tree_quantity: log.tree_quantity || '',
            tree_quality: log.tree_quality || 'good',
            survival_rate: log.survival_rate || '',
            estimated_value: log.estimated_value || '',
            reason: log.reason || '',
            notes: log.notes || '',
            media_url: log.media_url || ''
        });
        setIsEditing(true);
        setEditingId(log.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.delete_confirm)) return;
        setIsLoading(true);
        try {
            await pb.collection('annual_activities').delete(id);
            alert(t.delete_success);
            fetchLogs();
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormClose = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            model_id: '',
            activity_date: new Date().toISOString().split('T')[0],
            activity_type: 'fertilizer',
            description: '',
            material_name: '',
            amount: '',
            unit: 'kg/gốc',
            gcp_compliant: true,
            phi_days: '',
            tree_species: '',
            tree_quantity: '',
            tree_quality: 'good',
            survival_rate: '',
            estimated_value: '',
            reason: '',
            notes: '',
            media_url: ''
        });
        setGcpWarning(false);
    };

    const handleView = (activity) => {
        setSelectedActivity(activity);
        setShowDetailModal(true);
    };

    const canEdit = () => {
        if (!currentUser) return false;
        return currentUser.role === 'Admin';
    };

    const getActivityTypeBadge = (type) => {
        const styles = {
            fertilizer: { bg: '#dcfce7', color: '#166534', icon: 'fa-seedling', text: t.act_type_fertilizer },
            pesticide: { bg: '#fee2e2', color: '#991b1b', icon: 'fa-spray-can', text: t.act_type_pesticide },
            pruning: { bg: '#fef3c7', color: '#92400e', icon: 'fa-cut', text: t.act_type_pruning },
            harvesting: { bg: '#e0e7ff', color: '#4338ca', icon: 'fa-apple-alt', text: t.act_type_harvesting },
            tree_support: { bg: '#d1fae5', color: '#065f46', icon: 'fa-tree', text: t.act_type_tree_support },
            weeding: { bg: '#fef3c7', color: '#78350f', icon: 'fa-leaf', text: t.act_type_weeding },
            irrigation: { bg: '#dbeafe', color: '#1e40af', icon: 'fa-tint', text: t.act_type_irrigation },
            soil_management: { bg: '#f3e8ff', color: '#6b21a8', icon: 'fa-mountain', text: t.act_type_soil_mgmt },
            other: { bg: '#f1f5f9', color: '#475569', icon: 'fa-ellipsis-h', text: t.act_type_other }
        };
        const style = styles[type] || styles.other;
        return (
            <span style={{
                background: style.bg,
                color: style.color,
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
            }}>
                <i className={`fas ${style.icon}`}></i> {style.text}
            </span>
        );
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="btn-primary">
                        <i className="fas fa-plus"></i> {(t.act_add_btn || 'THÊM HOẠT ĐỘNG').toUpperCase()}
                    </button>
                )}
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3><i className="fas fa-calendar-alt" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.act_list_title}</h3>
                        <div className="badge">{logs.length} {t.activities?.toLowerCase()}</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>{t.model_code}</th>
                                <th>{appLang === 'vi' ? 'Hộ dân' : appLang === 'en' ? 'Farmer' : 'Mnuih hma'}</th>
                                <th>{t.date}</th>
                                <th>{t.type}</th>
                                <th>{t.details}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data}</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} onClick={() => handleView(log)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>{log.expand?.model_id?.model_code}</span></td>
                                        <td>
                                            <div style={{ fontSize: '11px', opacity: 0.7 }}>{log.expand?.model_id?.expand?.farmer_id?.farmer_code}</div>
                                            <div style={{ fontWeight: 600 }}>{log.expand?.model_id?.expand?.farmer_id?.full_name}</div>
                                        </td>
                                        <td>{log.activity_date}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {log.media_url && (
                                                    log.media_url.endsWith('.mp4') || log.media_url.endsWith('.mov') || log.media_url.endsWith('.webm') ?
                                                        <i className="fas fa-video" style={{ color: 'var(--coffee-primary)', fontSize: '10px' }}></i> :
                                                        <img src={log.media_url} alt="Act" style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />
                                                )}
                                                {getActivityTypeBadge(log.activity_type)}
                                            </div>
                                        </td>
                                        <td>
                                            {log.activity_type === 'tree_support' ? (
                                                <div>
                                                    <strong>{log.tree_species}</strong>
                                                    {log.survival_rate && <div style={{ fontSize: '10px', opacity: 0.6 }}>{t.train_survival}: {log.survival_rate}%</div>}
                                                </div>
                                            ) : (
                                                <div>
                                                    <strong>{log.material_name || log.description || '-'}</strong>
                                                    {log.activity_type === 'pesticide' && !log.gcp_compliant && (
                                                        <div style={{ fontSize: '10px', color: '#ef4444' }}>
                                                            <i className="fas fa-exclamation-triangle"></i> {appLang === 'vi' ? 'Không GCP' : appLang === 'en' ? 'Non-GCP' : 'Añ dơu GCP'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {log.activity_type === 'tree_support' ? (
                                                `${log.tree_quantity || 0} ${appLang === 'vi' ? 'cây' : appLang === 'en' ? 'trees' : 'kyâ'}`
                                            ) : (
                                                `${log.amount || '-'} ${log.unit || ''}`
                                            )}
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* VIEW BUTTON (Always visible) */}
                                                <button onClick={() => handleView(log)} className="btn-icon btn-view" title={t.details}>
                                                    <i className="fas fa-eye"></i>
                                                </button>

                                                {canEdit() && (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={() => handleEdit(log)} className="btn-icon btn-edit" title={t.edit}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(log.id)} className="btn-icon btn-delete" title={t.delete}>
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
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-pen-nib"></i> {isEditing ? (t.update + ' ' + t.act_title?.toLowerCase()) : (t.add + ' ' + t.act_title?.toLowerCase())}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{appLang === 'vi' ? 'Chọn mô hình cà phê' : appLang === 'en' ? 'Select Coffee Model' : 'Hriêng mô hình'} *</label>
                                <select
                                    className="input-pro"
                                    required
                                    value={formData.model_id}
                                    onChange={e => setFormData({ ...formData, model_id: e.target.value })}
                                >
                                    <option value="">-- {appLang === 'vi' ? 'Chọn mô hình' : appLang === 'en' ? 'Select Model' : 'Hriêng mô hình'} --</option>
                                    {models.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.model_code} - {m.name} ({m.expand?.farmer_id?.full_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t.date} *</label>
                                <input className="input-pro" type="date" value={formData.activity_date} onChange={e => setFormData({ ...formData, activity_date: e.target.value })} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.act_type} *</label>
                            <select
                                className="input-pro"
                                value={formData.activity_type}
                                onChange={e => setFormData({ ...formData, activity_type: e.target.value, material_name: '', gcpWarning: false })}
                                required
                            >
                                <option value="fertilizer">{t.act_type_fertilizer}</option>
                                <option value="pesticide">{t.act_type_pesticide}</option>
                                <option value="pruning">{t.act_type_pruning}</option>
                                <option value="harvesting">{t.act_type_harvesting}</option>
                                <option value="tree_support">{t.act_type_tree_support}</option>
                                <option value="weeding">{t.act_type_weeding}</option>
                                <option value="irrigation">{t.act_type_irrigation}</option>
                                <option value="soil_management">{t.act_type_soil_mgmt}</option>
                                <option value="other">{t.act_type_other}</option>
                            </select>
                        </div>

                        {/* Fertilizer/Pesticide Fields */}
                        {['fertilizer', 'pesticide'].includes(formData.activity_type) && (
                            <>
                                <div className="form-group">
                                    <label>{formData.activity_type === 'pesticide' ? (appLang === 'vi' ? 'Tên thuốc BVTV' : appLang === 'en' ? 'Pesticide Name' : 'Anàng thuốc BVTV') : (appLang === 'vi' ? 'Tên phân bón' : appLang === 'en' ? 'Fertilizer Name' : 'Anàng phân bón')} *</label>
                                    <input className="input-pro" value={formData.material_name} onChange={handleMaterialChange} placeholder={t.search_placeholder} required />

                                    {gcpWarning && (
                                        <div style={{ marginTop: '10px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '12px', border: '1px solid #fca5a5' }}>
                                            <i className="fas fa-skull-crossbones"></i> <strong>{appLang === 'vi' ? 'CẢNH BÁO: Thuốc không nằm trong danh sách GCP!' : appLang === 'en' ? 'WARNING: Material is not in GCP list!' : 'DLÊÑ: Thuốc añ dơu GCP!'}</strong>
                                        </div>
                                    )}
                                    {!gcpWarning && formData.activity_type === 'pesticide' && formData.material_name && (
                                        <div style={{ marginTop: '10px', padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', fontSize: '12px', border: '1px solid #a7f3d0' }}>
                                            <i className="fas fa-shield-alt"></i> {appLang === 'vi' ? 'Thuốc tuân thủ GCP' : appLang === 'en' ? 'GCP compliant material' : 'Thuốc dơu GCP'}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>{t.quantity} *</label>
                                        <input className="input-pro" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.unit} *</label>
                                        <input className="input-pro" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} required />
                                    </div>
                                </div>

                                {formData.activity_type === 'pesticide' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label>{appLang === 'vi' ? 'Lý do sử dụng' : appLang === 'en' ? 'Reason for use' : 'Lý do dưng'} </label>
                                            <input className="input-pro" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder={appLang === 'vi' ? "Phòng trừ sâu bệnh..." : "Pest control..."} />
                                        </div>
                                        <div className="form-group">
                                            <label>PHI ({t.act_phi_days})</label>
                                            <input className="input-pro" type="number" value={formData.phi_days} onChange={e => setFormData({ ...formData, phi_days: e.target.value })} placeholder="7" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Tree Support Fields */}
                        {formData.activity_type === 'tree_support' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>{appLang === 'vi' ? 'Loại cây giống' : appLang === 'en' ? 'Tree Species' : 'Anàng kyâ'} *</label>
                                        <input className="input-pro" value={formData.tree_species} onChange={e => setFormData({ ...formData, tree_species: e.target.value })} placeholder="Bơ, Sầu riêng, Macadamia..." required />
                                    </div>
                                    <div className="form-group">
                                        <label>{appLang === 'vi' ? 'Số lượng cây' : appLang === 'en' ? 'Tree Quantity' : 'Số lượng kyâ'} *</label>
                                        <input className="input-pro" type="number" value={formData.tree_quantity} onChange={e => setFormData({ ...formData, tree_quantity: e.target.value })} required />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>{appLang === 'vi' ? 'Chất lượng cây' : appLang === 'en' ? 'Tree Quality' : 'Klei jăp kyâ'}</label>
                                        <select className="input-pro" value={formData.tree_quality} onChange={e => setFormData({ ...formData, tree_quality: e.target.value })}>
                                            <option value="excellent">{appLang === 'vi' ? 'Xuất sắc' : appLang === 'en' ? 'Excellent' : 'Jăp hniêr'}</option>
                                            <option value="good">{appLang === 'vi' ? 'Tốt' : appLang === 'en' ? 'Good' : 'Jăp'}</option>
                                            <option value="fair">{appLang === 'vi' ? 'Trung bình' : appLang === 'en' ? 'Fair' : 'Gơ lă'}</option>
                                            <option value="poor">{appLang === 'vi' ? 'Kém' : appLang === 'en' ? 'Poor' : 'Dơu jăp'}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t.train_survival} (%)</label>
                                        <input className="input-pro" type="number" step="0.01" min="0" max="100" value={formData.survival_rate} onChange={e => setFormData({ ...formData, survival_rate: e.target.value })} placeholder="95.5" />
                                    </div>
                                    <div className="form-group">
                                        <label>{appLang === 'vi' ? 'Giá trị ước tính (VNĐ)' : appLang === 'en' ? 'Estimated Value' : 'Klei kơ prăk'}</label>
                                        <input className="input-pro" type="number" value={formData.estimated_value} onChange={e => setFormData({ ...formData, estimated_value: e.target.value })} placeholder="5000000" />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Common Fields */}
                        <div className="form-group">
                            <label>{t.description}</label>
                            <input className="input-pro" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={t.description + '...'} />
                        </div>

                        <div className="form-group">
                            <label>{t.notes}</label>
                            <textarea className="input-pro" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder={t.notes + '...'}></textarea>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>{appLang === 'vi' ? 'Ảnh/Video hoạt động' : appLang === 'en' ? 'Activity Photo/Video' : 'Ảnh/Video hma'}</label>
                            <MediaUpload
                                entityType="activities"
                                entityId={isEditing ? editingId : 'new'}
                                currentUrl={formData.media_url}
                                onUploadSuccess={(url) => setFormData({ ...formData, media_url: url })}
                                appLang={appLang}
                                allowMultiple={true}
                            />
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading}>
                                <i className="fas fa-save"></i> {isLoading ? t.loading : (isEditing ? t.update.toUpperCase() : t.add.toUpperCase())}
                            </button>
                            <button type="button" className="btn-primary" onClick={handleFormClose} style={{ background: '#f1f5f9', color: '#475569' }}>
                                <i className="fas fa-undo"></i> {t.cancel.toUpperCase()}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ACTIVITY DETAIL MODAL */}
            {showDetailModal && selectedActivity && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px' }}>
                                <i className="fas fa-calendar-check" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                                {t.act_form_title}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        {selectedActivity.media_url && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
                                {selectedActivity.media_url.split(',').map((url, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                                        {url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm') ? (
                                            <video src={url} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '15px' }} />
                                        ) : (
                                            <img src={url} alt={`Activity ${idx}`} style={{ width: '100%', maxHeight: '200px', borderRadius: '15px', objectFit: 'cover' }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Section 1: Context */}
                            <div className="detail-section" style={{ gridColumn: 'span 2' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.general_info}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Mô hình' : appLang === 'en' ? 'Model' : 'Mô hình'}</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)' }}>{selectedActivity.expand?.model_id?.name} ({selectedActivity.expand?.model_id?.model_code})</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer}</label>
                                <div style={{ fontWeight: 600 }}>{selectedActivity.expand?.model_id?.expand?.farmer_id?.full_name}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.act_type}</label>
                                <div>{getActivityTypeBadge(selectedActivity.activity_type)}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.date}</label>
                                <div>{new Date(selectedActivity.activity_date).toLocaleDateString(appLang === 'en' ? 'en-US' : 'vi-VN')}</div>
                            </div>

                            {/* Section 2: Specific Details */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.act_detail}</h4>
                            </div>

                            {['fertilizer', 'pesticide'].includes(selectedActivity.activity_type) && (
                                <>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Tên vật tư' : appLang === 'en' ? 'Material Name' : 'Anàng vật tư'}</label>
                                        <div style={{ fontWeight: 'bold' }}>{selectedActivity.material_name}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.quantity}</label>
                                        <div>{selectedActivity.amount} {selectedActivity.unit}</div>
                                    </div>
                                    {selectedActivity.activity_type === 'pesticide' && (
                                        <>
                                            <div className="detail-item">
                                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Tuân thủ GCP' : appLang === 'en' ? 'GCP Compliant' : 'Dơu GCP'}</label>
                                                <div>
                                                    {selectedActivity.gcp_compliant ?
                                                        <span style={{ color: 'green' }}><i className="fas fa-check-circle"></i> {appLang === 'vi' ? 'Đạt chuẩn' : appLang === 'en' ? 'Compliant' : 'Dơu'}</span> :
                                                        <span style={{ color: 'red' }}><i className="fas fa-exclamation-triangle"></i> {appLang === 'vi' ? 'Không đạt' : appLang === 'en' ? 'Non-compliant' : 'Añ dơu'}</span>
                                                    }
                                                </div>
                                            </div>
                                            <div className="detail-item">
                                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.act_phi_days}</label>
                                                <div>{selectedActivity.phi_days || '---'} {appLang === 'vi' ? 'ngày' : appLang === 'en' ? 'days' : 'hrơi'}</div>
                                            </div>
                                            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Lý do sử dụng' : appLang === 'en' ? 'Reason' : 'Lý do'}</label>
                                                <div>{selectedActivity.reason || '---'}</div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {selectedActivity.activity_type === 'tree_support' && (
                                <>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Loại cây' : appLang === 'en' ? 'Species' : 'Anàng kyâ'}</label>
                                        <div style={{ fontWeight: 'bold' }}>{selectedActivity.tree_species}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.quantity}</label>
                                        <div>{selectedActivity.tree_quantity} {appLang === 'vi' ? 'cây' : appLang === 'en' ? 'trees' : 'kyâ'}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Chất lượng' : appLang === 'en' ? 'Quality' : 'Klei hniêr'}</label>
                                        <div>{selectedActivity.tree_quality}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.train_survival}</label>
                                        <div>{selectedActivity.survival_rate ? `${selectedActivity.survival_rate}%` : '---'}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Giá trị ước tính' : appLang === 'en' ? 'Estimated Value' : 'Klei kơ prăk'}</label>
                                        <div>{selectedActivity.estimated_value ? selectedActivity.estimated_value.toLocaleString(appLang === 'en' ? 'en-US' : 'vi-VN') + ' đ' : '---'}</div>
                                    </div>
                                </>
                            )}

                            {selectedActivity.description && (
                                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.description}</label>
                                    <div>{selectedActivity.description}</div>
                                </div>
                            )}

                            {selectedActivity.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.notes}</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedActivity.notes}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {canEdit() && (
                                    <>
                                        <button onClick={() => { setShowDetailModal(false); handleEdit(selectedActivity); }} style={{
                                            background: '#fef3c7', border: '1px solid #d97706',
                                            color: '#92400e', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                                        }}>
                                            <i className="fas fa-pen"></i> {t.edit}
                                        </button>
                                        <button onClick={() => { setShowDetailModal(false); handleDelete(selectedActivity.id); }} style={{
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

export default AnnualActivities;
