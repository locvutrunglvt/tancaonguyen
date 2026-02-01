import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getPHRecommendation } from './agronomyUtils';
import { translations } from './translations';
import './Dashboard.css';

const FarmProfiles = ({ onBack, devUser, appLang = 'vi' }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [baselines, setBaselines] = useState([]);

    const [formData, setFormData] = useState({
        farmer_name: '',
        village: '',
        gps_lat: '',
        gps_long: '',
        total_area: '',
        coffee_area: '',
        intercrop_area: '',
        intercrop_details: 'Macadamia, Durian',
        soil_ph: '',
        grass_cover: 'Medium',
        water_source: 'Giếng đào'
    });

    const [phFeedback, setPhFeedback] = useState(null);

    useEffect(() => {
        fetchBaselines();
    }, []);

    const fetchBaselines = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('farm_baselines')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBaselines(data || []);

            // If data exists, pre-fill form with the latest
            if (data && data.length > 0) {
                const latest = data[0];
                setFormData({
                    ...latest,
                    soil_ph: latest.soil_ph?.toString() || '',
                    gps_lat: latest.gps_lat?.toString() || '',
                    gps_long: latest.gps_long?.toString() || '',
                    total_area: latest.total_area?.toString() || '',
                    coffee_area: latest.coffee_area?.toString() || '',
                    intercrop_area: latest.intercrop_area?.toString() || ''
                });
                if (latest.soil_ph) {
                    setPhFeedback(getPHRecommendation(latest.soil_ph.toString(), appLang));
                }
            }
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

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || devUser?.id;

        const payload = {
            ...formData,
            user_id: userId,
            soil_ph: parseFloat(formData.soil_ph) || 0,
            gps_lat: parseFloat(formData.gps_lat) || 0,
            gps_long: parseFloat(formData.gps_long) || 0,
            total_area: parseFloat(formData.total_area) || 0,
            coffee_area: parseFloat(formData.coffee_area) || 0,
            intercrop_area: parseFloat(formData.intercrop_area) || 0
        };

        delete payload.id;

        const { error } = await supabase
            .from('farm_baselines')
            .insert([payload]);

        if (error) {
            alert((appLang === 'vi' ? 'Lỗi lưu dữ liệu: ' : 'Error saving data: ') + error.message);
        } else {
            alert(t.save_success || 'Saved successfully.');
            setShowForm(false);
            fetchBaselines();
        }
        setIsLoading(false);
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
                        <i className="fas fa-map-plus"></i> {t.farm_add.toUpperCase()}
                    </button>
                )}
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>{t.farm_title}</h3>
                        <div className="badge">{t.farm_baseline}</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>{t.farm_date || 'Survey Date'}</th>
                                <th>{t.farm_owner || 'Owner'}</th>
                                <th>{t.farm_village}</th>
                                <th>{t.farm_total_area || 'Total Area (ha)'}</th>
                                <th>{t.farm_soil_ph}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baselines.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', opacity: 0.5 }}>
                                        {t.no_data || 'No survey data.'}
                                    </td>
                                </tr>
                            ) : (
                                baselines.map(b => (
                                    <tr key={b.id}>
                                        <td>{new Date(b.created_at).toLocaleDateString(appLang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                                        <td style={{ fontWeight: 600 }}>{b.farmer_name}</td>
                                        <td>{b.village}</td>
                                        <td>{b.total_area} ha</td>
                                        <td>
                                            <span style={{
                                                color: b.soil_ph < 4 ? '#ef4444' : '#059669',
                                                fontWeight: 700
                                            }}>
                                                {b.soil_ph}
                                            </span>
                                        </td>
                                        <td>
                                            <button style={{ background: 'none', border: 'none', color: '#64748b' }}><i className="fas fa-eye"></i></button>
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
                        <i className="fas fa-clipboard-check"></i> {t.farm_form_title || 'Baseline Information'}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>{t.farm_section_a || 'A. Identification'}</h4>
                                <div className="form-group">
                                    <label>{t.farmer_name}</label>
                                    <input className="input-pro" required value={formData.farmer_name} onChange={e => setFormData({ ...formData, farmer_name: e.target.value })} placeholder="Nguyễn Văn A" />
                                </div>
                                <div className="form-group">
                                    <label>{t.farm_village}</label>
                                    <input className="input-pro" value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} placeholder="Buôn Ea Kmát..." />
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
                            </div>

                            <div className="form-section">
                                <h4 style={{ color: 'var(--primary-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>{t.farm_section_b || 'B. Cultivation'}</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_total_area || 'Total Area (ha)'}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.total_area} onChange={e => setFormData({ ...formData, total_area: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farm_coffee_area}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.coffee_area} onChange={e => setFormData({ ...formData, coffee_area: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>{t.farm_intercrop_area || 'Intercrop Area (ha)'}</label>
                                        <input className="input-pro" type="number" step="0.1" value={formData.intercrop_area} onChange={e => setFormData({ ...formData, intercrop_area: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.farm_water_source || 'Water Source'}</label>
                                        <select className="input-pro" value={formData.water_source} onChange={e => setFormData({ ...formData, water_source: e.target.value })}>
                                            <option value="Giếng đào">{t.water_gieng_dao || 'Dug Well'}</option>
                                            <option value="Giếng khoan">{t.water_gieng_khoan || 'Drilled Well'}</option>
                                            <option value="Hồ/Suối">{t.water_ho_suoi || 'Lake/Stream'}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t.farm_intercrop_details || 'Intercrop Details'}</label>
                                    <input className="input-pro" value={formData.intercrop_details} onChange={e => setFormData({ ...formData, intercrop_details: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '25px', padding: '20px', background: 'var(--tcn-light)', borderRadius: '15px' }}>
                            <h4 style={{ color: 'var(--tcn-dark)', marginBottom: '15px', textTransform: 'uppercase', fontSize: '12px' }}>{t.farm_section_c || 'C. Soil Indicators'}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px', alignItems: 'start' }}>
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
                                        border: `1px solid ${phFeedback.includes('CẢNH BÁO') || phFeedback.includes('WARNING') || phFeedback.includes('DLÊÑ') ? '#fca5a5' : '#a7f3d0'}`
                                    }}>
                                        <i className={phFeedback.includes('CẢNH BÁO') || phFeedback.includes('WARNING') || phFeedback.includes('DLÊÑ') ? "fas fa-exclamation-triangle" : "fas fa-check-circle"}></i> {phFeedback}
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>{t.farm_grass_cover || 'Grass Cover'}</label>
                                <select className="input-pro" value={formData.grass_cover} onChange={e => setFormData({ ...formData, grass_cover: e.target.value })}>
                                    <option value="Low">{t.grass_low || 'Low (< 30%)'}</option>
                                    <option value="Medium">{t.grass_medium || 'Medium (30 - 60%)'}</option>
                                    <option value="High">{t.grass_high || 'High (> 60%)'}</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>
                                <i className="fas fa-save"></i> {isLoading ? t.loading : (t.farm_save_btn || 'SAVE BASELINE')}
                            </button>
                            <button type="button" className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                                {t.cancel.toUpperCase()}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default FarmProfiles;
