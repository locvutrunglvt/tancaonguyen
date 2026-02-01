import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { isGCPCompliant } from './agronomyUtils';
import { translations } from './translations';
import './Dashboard.css';

const AnnualActivities = ({ onBack, devUser, appLang = 'vi' }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [logs, setLogs] = useState([]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Fertilizer', // Fertilizer, Pesticide, Irrigation, Weeding, Pruning, Harvest
        material_name: '',
        amount: '',
        unit: 'kg/gốc',
        reason: '',
        phi: '' // Pre-harvest interval (Thời gian cách ly)
    });

    const [gcpWarning, setGcpWarning] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('annual_activities')
                .select('*')
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
        if (formData.type === 'Pesticide') {
            setGcpWarning(!isGCPCompliant(val));
        } else {
            setGcpWarning(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || devUser?.id;

        const payload = {
            user_id: userId,
            activity_date: formData.date,
            activity_type: formData.type,
            material_name: formData.material_name,
            amount: parseFloat(formData.amount) || 0,
            unit: formData.unit,
            reason: formData.reason,
            phi_days: parseInt(formData.phi) || 0,
            gcp_compliant: !gcpWarning
        };

        const { error } = await supabase
            .from('annual_activities')
            .insert([payload]);

        if (error) {
            alert(t.save_error || 'Error: ' + error.message);
        } else {
            alert(t.save_success || 'Saved successfully.');
            setShowForm(false);
            fetchLogs();
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
                        <i className="fas fa-plus"></i> {t.act_add_btn}
                    </button>
                )}
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3><i className="fas fa-calendar-alt" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.act_title}</h3>
                        <div className="badge">{t.act_group}</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>{t.act_date}</th>
                                <th>{t.act_type}</th>
                                <th>{t.act_detail}</th>
                                <th>{t.act_status}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.activity_date}</td>
                                    <td>
                                        <span className="badge-org" style={{ background: '#f1f5f9' }}>
                                            {t.act_types[log.activity_type] || log.activity_type}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{log.material_name} ({log.amount} {log.unit})</td>
                                    <td>
                                        <span style={{
                                            color: !log.gcp_compliant ? '#ef4444' : '#059669',
                                            fontWeight: 700,
                                            fontSize: '11px'
                                        }}>
                                            <i className={!log.gcp_compliant ? "fas fa-exclamation-circle" : "fas fa-check-circle"}></i> {log.gcp_compliant ? (t.confirm) : (t.act_warning_gcp)}
                                        </span>
                                    </td>
                                    <td>
                                        <button style={{ background: 'none', border: 'none', color: '#64748b' }}><i className="fas fa-eye"></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className="fas fa-pen-nib"></i> {t.act_form_title}
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>{t.act_date}</label>
                            <input className="input-pro" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>{t.act_type}</label>
                            <select className="input-pro" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value, material_name: '', gcpWarning: false })}>
                                <option value="Fertilizer">{t.act_types?.Fertilizer || 'Fertilizer'}</option>
                                <option value="Pesticide">{t.act_types?.Pesticide || 'Pesticide'}</option>
                                <option value="Irrigation">{t.act_types?.Irrigation || 'Irrigation'}</option>
                                <option value="Weeding">{t.act_types?.Weeding || 'Weeding'}</option>
                                <option value="Pruning">{t.act_types?.Pruning || 'Pruning'}</option>
                                <option value="Harvest">{t.act_types?.Harvest || 'Harvest'}</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>{formData.type === 'Pesticide' ? t.act_material_pest : formData.type === 'Fertilizer' ? t.act_material_fert : t.act_material_other}</label>
                        <input className="input-pro" value={formData.material_name} onChange={handleMaterialChange} placeholder={t.act_placeholder} />

                        {gcpWarning && (
                            <div style={{ marginTop: '10px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '12px', border: '1px solid #fca5a5' }}>
                                <i className="fas fa-skull-crossbones"></i> <strong>{t.act_warning_gcp}</strong>
                            </div>
                        )}
                        {!gcpWarning && formData.type === 'Pesticide' && formData.material_name && (
                            <div style={{ marginTop: '10px', padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', fontSize: '12px', border: '1px solid #a7f3d0' }}>
                                <i className="fas fa-shield-alt"></i> {t.act_compliant_gcp}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>{t.act_amount}</label>
                            <input className="input-pro" type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>{t.act_unit}</label>
                            <input className="input-pro" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                        </div>
                    </div>

                    {formData.type === 'Pesticide' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{t.act_reason}</label>
                                <input className="input-pro" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>{t.act_phi}</label>
                                <input className="input-pro" type="number" value={formData.phi} onChange={e => setFormData({ ...formData, phi: e.target.value })} />
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                        <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                            <i className="fas fa-check"></i> {t.confirm}
                        </button>
                        <button className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                            {t.cancel}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnualActivities;
