import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getPHRecommendation } from './agronomyUtils';
import { translations } from './translations';
import './Dashboard.css';

const FarmProfiles = ({ onBack, devUser, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [baselines, setBaselines] = useState([]);
    const [farmers, setFarmers] = useState([]);

    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Detail View State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedFarm, setSelectedFarm] = useState(null);

    const [formData, setFormData] = useState({
        farmer_id: '',
        farm_code: '',
        farm_name: '',
        total_area: '',
        coffee_area: '',
        intercrop_area: '',
        intercrop_details: 'Macadamia, Durian',
        gps_lat: '',
        gps_long: '',
        elevation: '',
        soil_type: '',
        soil_ph: '',
        slope: 'gentle',
        water_source: 'Giếng đào',
        irrigation_system: '',
        grass_cover: 'Medium',
        shade_trees: 0,
        notes: ''
    });

    const [phFeedback, setPhFeedback] = useState(null);

    useEffect(() => {
        fetchFarmers();
        fetchBaselines();
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
        } catch (err) {
            console.error('Error fetching farmers:', err.message);
        }
    };

    const fetchBaselines = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('farm_baselines')
                .select(`
    *,
    farmer: farmers(farmer_code, full_name, village)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBaselines(data || []);
        } catch (err) {
            console.error('Error fetching baselines:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePHChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, soil_ph: val });
        setPhFeedback(getPHRecommendation(val, appLang));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            farmer_id: formData.farmer_id,
            farm_name: formData.farm_name,
            total_area: parseFloat(formData.total_area) || null,
            coffee_area: parseFloat(formData.coffee_area) || null,
            intercrop_area: parseFloat(formData.intercrop_area) || null,
            intercrop_details: formData.intercrop_details,
            gps_lat: parseFloat(formData.gps_lat) || null,
            gps_long: parseFloat(formData.gps_long) || null,
            elevation: parseFloat(formData.elevation) || null,
            soil_type: formData.soil_type,
            soil_ph: parseFloat(formData.soil_ph) || null,
            slope: formData.slope,
            water_source: formData.water_source,
            irrigation_system: formData.irrigation_system,
            grass_cover: formData.grass_cover,
            shade_trees: parseInt(formData.shade_trees) || 0,
            notes: formData.notes
        };

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('farm_baselines')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                alert(t.save_success || 'Cập nhật thành công.');
            } else {
                const { error } = await supabase
                    .from('farm_baselines')
                    .insert([payload]);

                if (error) throw error;
                alert(t.save_success || 'Saved successfully.');
            }
            handleFormClose();
            fetchBaselines();
        } catch (error) {
            console.error('SAVE_ERROR:', error);
            alert((t.save_error || 'Error: ') + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (farm) => {
        setFormData({
            farmer_id: farm.farmer_id,
            farm_code: farm.farm_code,
            farm_name: farm.farm_name || '',
            total_area: farm.total_area || '',
            coffee_area: farm.coffee_area || '',
            intercrop_area: farm.intercrop_area || '',
            intercrop_details: farm.intercrop_details || 'Macadamia, Durian',
            gps_lat: farm.gps_lat || '',
            gps_long: farm.gps_long || '',
            elevation: farm.elevation || '',
            soil_type: farm.soil_type || '',
            soil_ph: farm.soil_ph || '',
            slope: farm.slope || 'gentle',
            water_source: farm.water_source || 'Giếng đào',
            irrigation_system: farm.irrigation_system || '',
            grass_cover: farm.grass_cover || 'Medium',
            shade_trees: farm.shade_trees || 0,
            notes: farm.notes || ''
        });
        setIsEditing(true);
        setEditingId(farm.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.act_confirm_delete || 'Xác nhận xóa?')) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('farm_baselines').delete().eq('id', id);
            if (error) throw error;
            alert(t.delete_success || 'Deleted successfully.');
            fetchBaselines();
        } catch (error) {
            alert(`DELETE_ERROR: ${error.message} `);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormClose = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            farmer_id: '',
            farm_code: '',
            farm_name: '',
            total_area: '',
            coffee_area: '',
            intercrop_area: '',
            intercrop_details: 'Macadamia, Durian',
            gps_lat: '',
            gps_long: '',
            elevation: '',
            soil_type: '',
            soil_ph: '',
            slope: 'gentle',
            water_source: 'Giếng đào',
            irrigation_system: '',
            grass_cover: 'Medium',
            shade_trees: 0,
            notes: ''
        });
    };

    const handleView = (farm) => {
        setSelectedFarm(farm);
        setShowDetailModal(true);
    };

    const canEdit = () => {
        if (!currentUser && !devUser) return false;
        const user = currentUser || devUser;
        return user.role === 'Admin';
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                {!showForm && (
                    <button onClick={() => {
                        setIsEditing(false);
                        setShowForm(true);
                    }} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                        <i className="fas fa-map-plus"></i> {(t.farm_add || 'THÊM TRANG TRẠI').toUpperCase()}
                    </button>
                )}
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3><i className="fas fa-map-marked-alt" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.farm_title}</h3>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>Mã nông dân</th>
                                <th>{t.farm_owner || 'Chủ trang trại'}</th>
                                <th>Thôn/Buôn</th>
                                <th>{t.farm_total_area || 'Tổng diện tích (ha)'}</th>
                                <th>Diện tích cà phê (ha)</th>
                                <th>{t.farm_soil_ph}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baselines.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', opacity: 0.5 }}>
                                        {t.no_data || 'Chưa có dữ liệu trang trại.'}
                                    </td>
                                </tr>
                            ) : (
                                baselines.map(b => (
                                    <tr key={b.id} onClick={() => handleView(b)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>{b.farmer?.farmer_code}</span></td>
                                        <td style={{ fontWeight: 600 }}>{b.farmer?.full_name}</td>
                                        <td>{b.farmer?.village}</td>
                                        <td>{b.total_area} ha</td>
                                        <td>{b.coffee_area} ha</td>
                                        <td>
                                            <span style={{
                                                color: b.soil_ph < 4 ? '#ef4444' : '#059669',
                                                fontWeight: 700
                                            }}>
                                                {b.soil_ph}
                                            </span>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* VIEW BUTTON */}
                                                <button onClick={() => handleView(b)} style={{
                                                    background: '#e0f2fe', border: '1px solid #7dd3fc',
                                                    color: '#0369a1', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }} title="Xem chi tiết">
                                                    <i className="fas fa-eye"></i>
                                                </button>

                                                {/* EDIT/DELETE (Conditional) */}
                                                {canEdit() && (
                                                    <>
                                                        <button onClick={() => handleEdit(b)} style={{
                                                            background: '#fef3c7', border: '1px solid #d97706',
                                                            color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }} title={t.edit || "Sửa"}>
                                                            <i className="fas fa-pen"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(b.id)} style={{
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
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-clipboard-check"></i> {isEditing ? 'Cập nhật trang trại' : (t.farm_form_title || 'Thông tin trang trại')}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>A. Thông tin chủ sở hữu</h4>

                                <div className="form-group">
                                    <label>Chọn nông dân *</label>
                                    <select
                                        className="input-pro"
                                        required
                                        value={formData.farmer_id}
                                        onChange={e => setFormData({ ...formData, farmer_id: e.target.value })}
                                    >
                                        <option value="">-- Chọn nông dân --</option>
                                        {farmers.map(f => (
                                            <option key={f.id} value={f.id}>
                                                {f.farmer_code} - {f.full_name} ({f.village})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Tên trang trại</label>
                                    <input className="input-pro" value={formData.farm_name} onChange={e => setFormData({ ...formData, farm_name: e.target.value })} placeholder="Trang trại cà phê..." />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_gps_lat || 'GPS Lat'}</label>
                                        <input className="input-pro" type="number" step="0.000001" value={formData.gps_lat} onChange={e => setFormData({ ...formData, gps_lat: e.target.value })} placeholder="12.6..." />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farm_gps_long || 'GPS Long'}</label>
                                        <input className="input-pro" type="number" step="0.000001" value={formData.gps_long} onChange={e => setFormData({ ...formData, gps_long: e.target.value })} placeholder="108.0..." />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Độ cao (m)</label>
                                    <input className="input-pro" type="number" step="0.1" value={formData.elevation} onChange={e => setFormData({ ...formData, elevation: e.target.value })} placeholder="500" />
                                </div>
                            </div>

                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>B. Diện tích canh tác</h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_total_area || 'Tổng diện tích (ha)'} *</label>
                                        <input className="input-pro" type="number" step="0.1" required value={formData.total_area} onChange={e => setFormData({ ...formData, total_area: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farm_coffee_area || 'Diện tích cà phê (ha)'}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.coffee_area} onChange={e => setFormData({ ...formData, coffee_area: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_intercrop_area || 'Diện tích xen canh (ha)'}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.intercrop_area} onChange={e => setFormData({ ...formData, intercrop_area: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Số cây bóng mát</label>
                                        <input className="input-pro" type="number" value={formData.shade_trees} onChange={e => setFormData({ ...formData, shade_trees: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t.farm_intercrop_details || 'Chi tiết xen canh'}</label>
                                    <input className="input-pro" value={formData.intercrop_details} onChange={e => setFormData({ ...formData, intercrop_details: e.target.value })} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_water_source || 'Nguồn nước'}</label>
                                        <select className="input-pro" value={formData.water_source} onChange={e => setFormData({ ...formData, water_source: e.target.value })}>
                                            <option value="Giếng đào">{t.water_gieng_dao || 'Giếng đào'}</option>
                                            <option value="Giếng khoan">{t.water_gieng_khoan || 'Giếng khoan'}</option>
                                            <option value="Hồ/Suối">{t.water_ho_suoi || 'Hồ/Suối'}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Hệ thống tưới</label>
                                        <input className="input-pro" value={formData.irrigation_system} onChange={e => setFormData({ ...formData, irrigation_system: e.target.value })} placeholder="Tưới nhỏ giọt..." />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '25px', padding: '20px', background: 'var(--tcn-light)', borderRadius: '15px' }}>
                            <h4 style={{ color: 'var(--tcn-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>C. Chỉ số đất đai</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '20px', alignItems: 'start' }}>
                                <div className="form-group">
                                    <label>{t.farm_soil_ph}</label>
                                    <input
                                        className="input-pro"
                                        type="number"
                                        step="0.01"
                                        value={formData.soil_ph}
                                        onChange={handlePHChange}
                                        style={{ borderColor: phFeedback?.includes('CẢNH BÁO') || phFeedback?.includes('WARNING') || phFeedback?.includes('DLÊÑ') ? '#ef4444' : '' }}
                                    />
                                </div>

                                {phFeedback && (
                                    <div style={{
                                        padding: '15px',
                                        borderRadius: '12px',
                                        background: phFeedback.includes('CẢNH BÁO') || phFeedback.includes('WARNING') || phFeedback.includes('DLÊÑ') ? '#fee2e2' : '#ecfdf5',
                                        color: phFeedback.includes('CẢNH BÁO') || phFeedback.includes('WARNING') || phFeedback.includes('DLÊÑ') ? '#991b1b' : '#065f46',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        border: `1px solid ${phFeedback.includes('CẢNH BÁO') || phFeedback.includes('WARNING') || phFeedback.includes('DLÊÑ') ? '#fca5a5' : '#a7f3d0'} `
                                    }}>
                                        <i className={phFeedback.includes('CẢNH BÁO') || phFeedback.includes('WARNING') || phFeedback.includes('DLÊÑ') ? "fas fa-exclamation-triangle" : "fas fa-check-circle"}></i> {phFeedback}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Độ dốc</label>
                                    <select className="input-pro" value={formData.slope} onChange={e => setFormData({ ...formData, slope: e.target.value })}>
                                        <option value="flat">Bằng phẳng</option>
                                        <option value="gentle">Dốc nhẹ</option>
                                        <option value="moderate">Dốc vừa</option>
                                        <option value="steep">Dốc cao</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                <div className="form-group">
                                    <label>Loại đất</label>
                                    <input className="input-pro" value={formData.soil_type} onChange={e => setFormData({ ...formData, soil_type: e.target.value })} placeholder="Đất bazan..." />
                                </div>
                                <div className="form-group">
                                    <label>{t.farm_grass_cover || 'Độ phủ cỏ'}</label>
                                    <select className="input-pro" value={formData.grass_cover} onChange={e => setFormData({ ...formData, grass_cover: e.target.value })}>
                                        <option value="Low">{t.grass_low || 'Thấp (< 30%)'}</option>
                                        <option value="Medium">{t.grass_medium || 'Trung bình (30 - 60%)'}</option>
                                        <option value="High">{t.grass_high || 'Cao (> 60%)'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>Ghi chú</label>
                            <textarea className="input-pro" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ghi chú thêm về trang trại..."></textarea>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>
                                <i className="fas fa-save"></i> {isLoading ? t.loading : (isEditing ? 'CẬP NHẬT' : (t.farm_save_btn || 'LƯU THÔNG TIN'))}
                            </button>
                            <button type="button" className="btn-primary" onClick={handleFormClose} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                                {t.cancel.toUpperCase()}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* FARM DETAIL MODAL */}
            {showDetailModal && selectedFarm && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px' }}>
                                <i className="fas fa-map" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                                Chi tiết trang trại
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Section 1: Basic Info */}
                            <div className="detail-section" style={{ gridColumn: 'span 2' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Thông tin chung</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Mã trang trại</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)' }}>{selectedFarm.farm_code}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Chủ sở hữu</label>
                                <div style={{ fontWeight: 600 }}>{selectedFarm.farmer?.full_name} ({selectedFarm.farmer?.farmer_code})</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Địa chỉ</label>
                                <div>{selectedFarm.farmer?.village}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Tên trang trại</label>
                                <div>{selectedFarm.farm_name || '---'}</div>
                            </div>

                            {/* Section 2: Area & Soil */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Đất đai & Diện tích</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Tổng diện tích</label>
                                <div>{selectedFarm.total_area} ha</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Diện tích cà phê</label>
                                <div>{selectedFarm.coffee_area} ha</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Độ pH đất</label>
                                <div style={{
                                    color: selectedFarm.soil_ph < 4 || selectedFarm.soil_ph > 7 ? '#ef4444' : '#059669',
                                    fontWeight: 'bold'
                                }}>
                                    {selectedFarm.soil_ph}
                                </div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Loại đất</label>
                                <div>{selectedFarm.soil_type || '---'}</div>
                            </div>

                            {/* Section 3: Technical */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Kỹ thuật & Canh tác</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Xen canh</label>
                                <div>{selectedFarm.intercrop_details || 'Không'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Cây che bóng</label>
                                <div>{selectedFarm.shade_trees} cây</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Nguồn nước</label>
                                <div>{selectedFarm.water_source || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Hệ thống tưới</label>
                                <div>{selectedFarm.irrigation_system || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Độ dốc</label>
                                <div>{selectedFarm.slope || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Độ cao</label>
                                <div>{selectedFarm.elevation ? `${selectedFarm.elevation} m` : '---'}</div>
                            </div>

                            {selectedFarm.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Ghi chú</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedFarm.notes}</div>
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

export default FarmProfiles;
