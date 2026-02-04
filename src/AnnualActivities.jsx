import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { isGCPCompliant } from './agronomyUtils';
import { translations } from './translations';
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
        notes: ''
    });

    const [gcpWarning, setGcpWarning] = useState(false);

    useEffect(() => {
        fetchModels();
        fetchLogs();
    }, []);

    const fetchModels = async () => {
        try {
            const { data, error } = await supabase
                .from('coffee_models')
                .select(`
                    id,
                    model_code,
                    name,
                    farmer:farmers(farmer_code, full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setModels(data || []);
        } catch (err) {
            console.error('Error fetching models:', err.message);
        }
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('annual_activities')
                .select(`
                    *,
                    model:coffee_models(
                        model_code,
                        name,
                        farmer:farmers(farmer_code, full_name)
                    )
                `)
                .order('activity_date', { ascending: false });

            if (error) throw error;
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
                notes: formData.notes
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
                const { error } = await supabase
                    .from('annual_activities')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                alert(t.save_success || 'Cập nhật thành công.');
            } else {
                const { error } = await supabase
                    .from('annual_activities')
                    .insert([payload]);

                if (error) throw error;
                alert(t.save_success || 'Lưu thành công.');
            }

            handleFormClose();
            fetchLogs();
        } catch (error) {
            alert((t.save_error || 'Lỗi: ') + error.message);
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
            notes: log.notes || ''
        });
        setIsEditing(true);
        setEditingId(log.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.act_confirm_delete || 'Xác nhận xóa?')) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('annual_activities').delete().eq('id', id);
            if (error) throw error;
            alert(t.delete_success || 'Đã xóa thành công.');
            fetchLogs();
        } catch (error) {
            alert(`Lỗi: ${error.message}`);
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
            notes: ''
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
            fertilizer: { bg: '#dcfce7', color: '#166534', icon: 'fa-seedling', text: 'Phân bón' },
            pesticide: { bg: '#fee2e2', color: '#991b1b', icon: 'fa-spray-can', text: 'Thuốc BVTV' },
            pruning: { bg: '#fef3c7', color: '#92400e', icon: 'fa-cut', text: 'Tỉa cành' },
            harvesting: { bg: '#e0e7ff', color: '#4338ca', icon: 'fa-apple-alt', text: 'Thu hoạch' },
            tree_support: { bg: '#d1fae5', color: '#065f46', icon: 'fa-tree', text: 'Hỗ trợ cây giống' },
            weeding: { bg: '#fef3c7', color: '#78350f', icon: 'fa-leaf', text: 'Làm cỏ' },
            irrigation: { bg: '#dbeafe', color: '#1e40af', icon: 'fa-tint', text: 'Tưới nước' },
            soil_management: { bg: '#f3e8ff', color: '#6b21a8', icon: 'fa-mountain', text: 'Quản lý đất' },
            other: { bg: '#f1f5f9', color: '#475569', icon: 'fa-ellipsis-h', text: 'Khác' }
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
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                        <i className="fas fa-plus"></i> {t.act_add_btn || 'THÊM HOẠT ĐỘNG'}
                    </button>
                )}
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3><i className="fas fa-calendar-alt" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.act_title || 'Hoạt động hàng năm'}</h3>
                        <div className="badge">{logs.length} hoạt động</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>Mã mô hình</th>
                                <th>Nông dân</th>
                                <th>Ngày</th>
                                <th>Loại hoạt động</th>
                                <th>Chi tiết</th>
                                <th>Số lượng</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', opacity: 0.5 }}>Chưa có hoạt động nào</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} onClick={() => handleView(log)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>{log.model?.model_code}</span></td>
                                        <td>
                                            <div style={{ fontSize: '11px', opacity: 0.7 }}>{log.model?.farmer?.farmer_code}</div>
                                            <div style={{ fontWeight: 600 }}>{log.model?.farmer?.full_name}</div>
                                        </td>
                                        <td>{log.activity_date}</td>
                                        <td>{getActivityTypeBadge(log.activity_type)}</td>
                                        <td>
                                            {log.activity_type === 'tree_support' ? (
                                                <div>
                                                    <strong>{log.tree_species}</strong>
                                                    {log.survival_rate && <div style={{ fontSize: '10px', opacity: 0.6 }}>Tỷ lệ sống: {log.survival_rate}%</div>}
                                                </div>
                                            ) : (
                                                <div>
                                                    <strong>{log.material_name || log.description || '-'}</strong>
                                                    {log.activity_type === 'pesticide' && !log.gcp_compliant && (
                                                        <div style={{ fontSize: '10px', color: '#ef4444' }}>
                                                            <i className="fas fa-exclamation-triangle"></i> Không GCP
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {log.activity_type === 'tree_support' ? (
                                                `${log.tree_quantity || 0} cây`
                                            ) : (
                                                `${log.amount || '-'} ${log.unit || ''}`
                                            )}
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* VIEW BUTTON (Always visible) */}
                                                <button onClick={() => handleView(log)} style={{
                                                    background: '#e0f2fe', border: '1px solid #7dd3fc',
                                                    color: '#0369a1', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }} title="Xem chi tiết">
                                                    <i className="fas fa-eye"></i>
                                                </button>

                                                {canEdit() && (
                                                    <>
                                                        <button onClick={() => handleEdit(log)} style={{
                                                            background: '#fef3c7', border: '1px solid #d97706',
                                                            color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }} title={t.edit || "Sửa"}>
                                                            <i className="fas fa-pen"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(log.id)} style={{
                                                            background: '#fef2f2', border: '1px solid #ef4444',
                                                            color: '#b91c1c', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }} title={t.delete || "Xóa"}>
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
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-pen-nib"></i> {isEditing ? 'Cập nhật hoạt động' : 'Thêm hoạt động mới'}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Chọn mô hình cà phê *</label>
                                <select
                                    className="input-pro"
                                    required
                                    value={formData.model_id}
                                    onChange={e => setFormData({ ...formData, model_id: e.target.value })}
                                >
                                    <option value="">-- Chọn mô hình --</option>
                                    {models.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.model_code} - {m.name} ({m.farmer?.full_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Ngày thực hiện *</label>
                                <input className="input-pro" type="date" value={formData.activity_date} onChange={e => setFormData({ ...formData, activity_date: e.target.value })} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Loại hoạt động *</label>
                            <select
                                className="input-pro"
                                value={formData.activity_type}
                                onChange={e => setFormData({ ...formData, activity_type: e.target.value, material_name: '', gcpWarning: false })}
                                required
                            >
                                <option value="fertilizer">Phân bón</option>
                                <option value="pesticide">Thuốc BVTV</option>
                                <option value="pruning">Tỉa cành</option>
                                <option value="harvesting">Thu hoạch</option>
                                <option value="tree_support">Hỗ trợ cây giống</option>
                                <option value="weeding">Làm cỏ</option>
                                <option value="irrigation">Tưới nước</option>
                                <option value="soil_management">Quản lý đất</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>

                        {/* Fertilizer/Pesticide Fields */}
                        {['fertilizer', 'pesticide'].includes(formData.activity_type) && (
                            <>
                                <div className="form-group">
                                    <label>{formData.activity_type === 'pesticide' ? 'Tên thuốc BVTV' : 'Tên phân bón'} *</label>
                                    <input className="input-pro" value={formData.material_name} onChange={handleMaterialChange} placeholder="Nhập tên..." required />

                                    {gcpWarning && (
                                        <div style={{ marginTop: '10px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '12px', border: '1px solid #fca5a5' }}>
                                            <i className="fas fa-skull-crossbones"></i> <strong>CẢNH BÁO: Thuốc không nằm trong danh sách GCP!</strong>
                                        </div>
                                    )}
                                    {!gcpWarning && formData.activity_type === 'pesticide' && formData.material_name && (
                                        <div style={{ marginTop: '10px', padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', fontSize: '12px', border: '1px solid #a7f3d0' }}>
                                            <i className="fas fa-shield-alt"></i> Thuốc tuân thủ GCP
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-group">
                                        <label>Số lượng *</label>
                                        <input className="input-pro" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Đơn vị *</label>
                                        <input className="input-pro" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} required />
                                    </div>
                                </div>

                                {formData.activity_type === 'pesticide' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label>Lý do sử dụng</label>
                                            <input className="input-pro" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Phòng trừ sâu bệnh..." />
                                        </div>
                                        <div className="form-group">
                                            <label>PHI (ngày)</label>
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
                                        <label>Loại cây giống *</label>
                                        <input className="input-pro" value={formData.tree_species} onChange={e => setFormData({ ...formData, tree_species: e.target.value })} placeholder="Bơ, Sầu riêng, Macadamia..." required />
                                    </div>
                                    <div className="form-group">
                                        <label>Số lượng cây *</label>
                                        <input className="input-pro" type="number" value={formData.tree_quantity} onChange={e => setFormData({ ...formData, tree_quantity: e.target.value })} required />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>Chất lượng cây</label>
                                        <select className="input-pro" value={formData.tree_quality} onChange={e => setFormData({ ...formData, tree_quality: e.target.value })}>
                                            <option value="excellent">Xuất sắc</option>
                                            <option value="good">Tốt</option>
                                            <option value="fair">Trung bình</option>
                                            <option value="poor">Kém</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Tỷ lệ sống (%)</label>
                                        <input className="input-pro" type="number" step="0.01" min="0" max="100" value={formData.survival_rate} onChange={e => setFormData({ ...formData, survival_rate: e.target.value })} placeholder="95.5" />
                                    </div>
                                    <div className="form-group">
                                        <label>Giá trị ước tính (VNĐ)</label>
                                        <input className="input-pro" type="number" value={formData.estimated_value} onChange={e => setFormData({ ...formData, estimated_value: e.target.value })} placeholder="5000000" />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Common Fields */}
                        <div className="form-group">
                            <label>Mô tả</label>
                            <input className="input-pro" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả ngắn gọn..." />
                        </div>

                        <div className="form-group">
                            <label>Ghi chú</label>
                            <textarea className="input-pro" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ghi chú thêm..."></textarea>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>
                                <i className="fas fa-check"></i> {isLoading ? t.loading : (isEditing ? 'CẬP NHẬT' : 'THÊM HOẠT ĐỘNG')}
                            </button>
                            <button type="button" className="btn-primary" onClick={handleFormClose} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                                {t.cancel}
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
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {getActivityTypeBadge(selectedActivity.activity_type)}
                                <span style={{ fontSize: '16px', color: '#666' }}>({selectedActivity.activity_date})</span>
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Section 1: Context */}
                            <div className="detail-section" style={{ gridColumn: 'span 2' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Thông tin chung</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Mô hình</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)' }}>{selectedActivity.model?.name} ({selectedActivity.model?.model_code})</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Nông dân</label>
                                <div style={{ fontWeight: 600 }}>{selectedActivity.model?.farmer?.full_name}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Loại hoạt động</label>
                                <div>{getActivityTypeBadge(selectedActivity.activity_type)}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Ngày thực hiện</label>
                                <div>{new Date(selectedActivity.activity_date).toLocaleDateString('vi-VN')}</div>
                            </div>

                            {/* Section 2: Specific Details */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Chi tiết hoạt động</h4>
                            </div>

                            {['fertilizer', 'pesticide'].includes(selectedActivity.activity_type) && (
                                <>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Tên vật tư</label>
                                        <div style={{ fontWeight: 'bold' }}>{selectedActivity.material_name}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Số lượng</label>
                                        <div>{selectedActivity.amount} {selectedActivity.unit}</div>
                                    </div>
                                    {selectedActivity.activity_type === 'pesticide' && (
                                        <>
                                            <div className="detail-item">
                                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Tuân thủ GCP</label>
                                                <div>
                                                    {selectedActivity.gcp_compliant ?
                                                        <span style={{ color: 'green' }}><i className="fas fa-check-circle"></i> Đạt chuẩn</span> :
                                                        <span style={{ color: 'red' }}><i className="fas fa-exclamation-triangle"></i> Không đạt</span>
                                                    }
                                                </div>
                                            </div>
                                            <div className="detail-item">
                                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>PHI (Ngày cách ly)</label>
                                                <div>{selectedActivity.phi_days || '---'} ngày</div>
                                            </div>
                                            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Lý do sử dụng</label>
                                                <div>{selectedActivity.reason || '---'}</div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {selectedActivity.activity_type === 'tree_support' && (
                                <>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Loại cây</label>
                                        <div style={{ fontWeight: 'bold' }}>{selectedActivity.tree_species}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Số lượng</label>
                                        <div>{selectedActivity.tree_quantity} cây</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Chất lượng</label>
                                        <div>{selectedActivity.tree_quality}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Tỷ lệ sống</label>
                                        <div>{selectedActivity.survival_rate ? `${selectedActivity.survival_rate}%` : '---'}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Giá trị ước tính</label>
                                        <div>{selectedActivity.estimated_value ? selectedActivity.estimated_value.toLocaleString('vi-VN') + ' đ' : '---'}</div>
                                    </div>
                                </>
                            )}

                            {selectedActivity.description && (
                                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Mô tả</label>
                                    <div>{selectedActivity.description}</div>
                                </div>
                            )}

                            {selectedActivity.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Ghi chú</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedActivity.notes}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', textAlign: 'right' }}>
                            <button onClick={() => setShowDetailModal(false)} style={{ padding: '8px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnualActivities;
