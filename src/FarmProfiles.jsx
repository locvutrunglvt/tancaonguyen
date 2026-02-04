import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getPHRecommendation } from './agronomyUtils';
import { translations } from './translations';
import MediaUpload from './MediaUpload';
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
        notes: '',
        photo_url: ''
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
            notes: formData.notes,
            photo_url: formData.photo_url
        };

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('farm_baselines')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                alert(t.save_success);
            } else {
                const { error } = await supabase
                    .from('farm_baselines')
                    .insert([payload]);

                if (error) throw error;
                alert(t.save_success);
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
            notes: farm.notes || '',
            photo_url: farm.photo_url || ''
        });
        setIsEditing(true);
        setEditingId(farm.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.delete_confirm)) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('farm_baselines').delete().eq('id', id);
            if (error) throw error;
            alert(t.delete_success);
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
            notes: '',
            photo_url: ''
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
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                {!showForm && (
                    <button onClick={() => {
                        setIsEditing(false);
                        setShowForm(true);
                    }} className="btn-primary">
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
                                <th>{t.farmer_code}</th>
                                <th>{t.farm_owner}</th>
                                <th>{t.village || t.farmer_village}</th>
                                <th>{t.farm_total_area}</th>
                                <th>{t.farm_coffee_area}</th>
                                <th>{t.farm_soil_ph}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baselines.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', opacity: 0.5 }}>
                                        {t.no_data}
                                    </td>
                                </tr>
                            ) : (
                                baselines.map(b => (
                                    <tr key={b.id} onClick={() => handleView(b)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>{b.farmer?.farmer_code}</span></td>
                                        <td style={{ fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {b.photo_url && <img src={b.photo_url} alt="Farm" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />}
                                                {b.farmer?.full_name}
                                            </div>
                                        </td>
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
                                                }} title={t.details}>
                                                    <i className="fas fa-eye"></i>
                                                </button>

                                                {/* EDIT/DELETE (Conditional) */}
                                                {canEdit() && (
                                                    <>
                                                        <button onClick={() => handleEdit(b)} style={{
                                                            background: '#fef3c7', border: '1px solid #d97706',
                                                            color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }} title={t.edit}>
                                                            <i className="fas fa-pen"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(b.id)} style={{
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
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-clipboard-check"></i> {isEditing ? (t.update + ' ' + t.farms?.toLowerCase()) : t.farm_form_title}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>{t.general_info}</h4>

                                <div className="form-group">
                                    <label>{appLang === 'vi' ? 'Chọn nông dân' : appLang === 'en' ? 'Select Farmer' : 'Hriêng mnuih'} *</label>
                                    <select
                                        className="input-pro"
                                        required
                                        value={formData.farmer_id}
                                        onChange={e => setFormData({ ...formData, farmer_id: e.target.value })}
                                    >
                                        <option value="">-- {appLang === 'vi' ? 'Chọn nông dân' : appLang === 'en' ? 'Select Farmer' : 'Hriêng mnuih'} --</option>
                                        {farmers.map(f => (
                                            <option key={f.id} value={f.id}>
                                                {f.farmer_code} - {f.full_name} ({f.village})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>{t.farm_name}</label>
                                    <input className="input-pro" value={formData.farm_name} onChange={e => setFormData({ ...formData, farm_name: e.target.value })} placeholder={appLang === 'vi' ? "Trang trại cà phê..." : "Coffee farm..."} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_gps_lat}</label>
                                        <input className="input-pro" type="number" step="0.000001" value={formData.gps_lat} onChange={e => setFormData({ ...formData, gps_lat: e.target.value })} placeholder="12.6..." />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farm_gps_long}</label>
                                        <input className="input-pro" type="number" step="0.000001" value={formData.gps_long} onChange={e => setFormData({ ...formData, gps_long: e.target.value })} placeholder="108.0..." />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t.farm_elevation}</label>
                                    <input className="input-pro" type="number" step="0.1" value={formData.elevation} onChange={e => setFormData({ ...formData, elevation: e.target.value })} placeholder="500" />
                                </div>
                            </div>

                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>B. {appLang === 'vi' ? 'Diện tích canh tác' : appLang === 'en' ? 'Cultivation Area' : 'Diện tích hma'}</h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_total_area} *</label>
                                        <input className="input-pro" type="number" step="0.1" required value={formData.total_area} onChange={e => setFormData({ ...formData, total_area: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farm_coffee_area}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.coffee_area} onChange={e => setFormData({ ...formData, coffee_area: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_intercrop_area}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.intercrop_area} onChange={e => setFormData({ ...formData, intercrop_area: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.train_survival || 'Số cây che bóng'}</label>
                                        <input className="input-pro" type="number" value={formData.shade_trees} onChange={e => setFormData({ ...formData, shade_trees: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t.farm_intercrop_details}</label>
                                    <input className="input-pro" value={formData.intercrop_details} onChange={e => setFormData({ ...formData, intercrop_details: e.target.value })} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_water_source}</label>
                                        <select className="input-pro" value={formData.water_source} onChange={e => setFormData({ ...formData, water_source: e.target.value })}>
                                            <option value="Giếng đào">{t.water_gieng_dao}</option>
                                            <option value="Giếng khoan">{t.water_gieng_khoan}</option>
                                            <option value="Hồ/Suối">{t.water_ho_suoi}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farm_irrigation_system}</label>
                                        <input className="input-pro" value={formData.irrigation_system} onChange={e => setFormData({ ...formData, irrigation_system: e.target.value })} placeholder={appLang === 'vi' ? "Tưới nhỏ giọt..." : "Drip irrigation..."} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '25px', padding: '20px', background: 'var(--tcn-light)', borderRadius: '15px' }}>
                            <h4 style={{ color: 'var(--tcn-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>C. {appLang === 'vi' ? 'Chỉ số đất đai' : appLang === 'en' ? 'Soil Indicators' : 'Klei kơ đất'}</h4>

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
                                    <label>{t.farm_slope}</label>
                                    <select className="input-pro" value={formData.slope} onChange={e => setFormData({ ...formData, slope: e.target.value })}>
                                        <option value="flat">{t.slope_flat}</option>
                                        <option value="gentle">{t.slope_gentle}</option>
                                        <option value="moderate">{t.slope_moderate}</option>
                                        <option value="steep">{t.slope_steep}</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                <div className="form-group">
                                    <label>{t.farm_soil_type}</label>
                                    <input className="input-pro" value={formData.soil_type} onChange={e => setFormData({ ...formData, soil_type: e.target.value })} placeholder={appLang === 'vi' ? "Đất bazan..." : "Basalt soil..."} />
                                </div>
                                <div className="form-group">
                                    <label>{t.farm_grass_cover}</label>
                                    <select className="input-pro" value={formData.grass_cover} onChange={e => setFormData({ ...formData, grass_cover: e.target.value })}>
                                        <option value="Low">{t.grass_low}</option>
                                        <option value="Medium">{t.grass_medium}</option>
                                        <option value="High">{t.grass_high}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>{t.notes}</label>
                            <textarea className="input-pro" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder={t.notes + '...'}></textarea>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>{appLang === 'vi' ? 'Ảnh trang trại' : appLang === 'en' ? 'Farm Photo' : 'Ảnh hma'}</label>
                            <MediaUpload
                                entityType="farms"
                                entityId={isEditing ? editingId : 'new'}
                                currentUrl={formData.photo_url}
                                onUploadSuccess={(url) => setFormData({ ...formData, photo_url: url })}
                                appLang={appLang}
                            />
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

            {/* FARM DETAIL MODAL */}
            {showDetailModal && selectedFarm && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px' }}>
                                <i className="fas fa-map-marked-alt" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                                {t.farm_title}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        {selectedFarm.photo_url && (
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <img src={selectedFarm.photo_url} alt="Farm" style={{ width: '100%', maxHeight: '250px', borderRadius: '15px', objectFit: 'cover' }} />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Section 1: Basic Info */}
                            <div className="detail-section" style={{ gridColumn: 'span 2' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.general_info}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_code}</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)' }}>{selectedFarm.farm_code || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.owner}</label>
                                <div style={{ fontWeight: 600 }}>{selectedFarm.farmer?.full_name} ({selectedFarm.farmer?.farmer_code})</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_address}</label>
                                <div>{selectedFarm.farmer?.village}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_name}</label>
                                <div>{selectedFarm.farm_name || '---'}</div>
                            </div>

                            {/* Section 2: Area & Soil */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{appLang === 'vi' ? 'Đất đai & Diện tích' : appLang === 'en' ? 'Soil & Area' : 'Đất hồ DT'}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_total_area}</label>
                                <div>{selectedFarm.total_area} ha</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_coffee_area}</label>
                                <div>{selectedFarm.coffee_area} ha</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_soil_ph}</label>
                                <div style={{
                                    color: selectedFarm.soil_ph < 4 || selectedFarm.soil_ph > 7 ? '#ef4444' : '#059669',
                                    fontWeight: 'bold'
                                }}>
                                    {selectedFarm.soil_ph}
                                </div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_soil_type}</label>
                                <div>{selectedFarm.soil_type || '---'}</div>
                            </div>

                            {/* Section 3: Technical */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{appLang === 'vi' ? 'Kỹ thuật & Canh tác' : appLang === 'en' ? 'Technical & Cultivation' : 'Kỹ thuật hma'}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_intercrop_details}</label>
                                <div>{selectedFarm.intercrop_details || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.train_survival || 'Số cây che bóng'}</label>
                                <div>{selectedFarm.shade_trees}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_water_source}</label>
                                <div>{selectedFarm.water_source || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_irrigation_system}</label>
                                <div>{selectedFarm.irrigation_system || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_slope}</label>
                                <div>{selectedFarm.slope || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farm_elevation}</label>
                                <div>{selectedFarm.elevation ? `${selectedFarm.elevation} m` : '---'}</div>
                            </div>

                            {selectedFarm.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.notes}</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedFarm.notes}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {canEdit() && (
                                    <>
                                        <button onClick={() => { setShowDetailModal(false); handleEdit(selectedFarm); }} style={{
                                            background: '#fef3c7', border: '1px solid #d97706',
                                            color: '#92400e', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                                        }}>
                                            <i className="fas fa-pen"></i> {t.edit}
                                        </button>
                                        <button onClick={() => { setShowDetailModal(false); handleDelete(selectedFarm.id); }} style={{
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

export default FarmProfiles;
