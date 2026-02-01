import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { isGCPCompliant } from './agronomyUtils';
import './Dashboard.css';

const AnnualActivities = ({ onBack, devUser }) => {
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
            alert('Lỗi lưu nhật ký: ' + error.message);
        } else {
            alert('Đã lưu nhật ký hoạt động.');
            setShowForm(false);
            fetchLogs();
        }
        setIsLoading(false);
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> Quay lại
                </button>
                <div style={{ flex: 1 }}></div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                        <i className="fas fa-plus"></i> GHI NHẬT KÝ MỚI
                    </button>
                )}
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>Nhật ký Hoạt động thường niên</h3>
                        <div className="badge">Nhóm B: Canh tác & Bảo vệ thực vật</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>Ngày thực hiện</th>
                                <th>Loại hoạt động</th>
                                <th>Chi tiết nội dung</th>
                                <th>Trạng thái Tuân thủ</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.date}</td>
                                    <td><span className="badge-org" style={{ background: '#f1f5f9' }}>{log.type}</span></td>
                                    <td style={{ fontWeight: 600 }}>{log.details}</td>
                                    <td>
                                        <span style={{
                                            color: log.status.includes('Cảnh báo') ? '#ef4444' : '#059669',
                                            fontWeight: 700,
                                            fontSize: '11px'
                                        }}>
                                            <i className={log.status.includes('Cảnh báo') ? "fas fa-exclamation-circle" : "fas fa-check-circle"}></i> {log.status}
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
                        <i className="fas fa-pen-nib"></i> Ghi nhận hoạt động vườn cây
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>Ngày thực hiện</label>
                            <input className="input-pro" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Loại hoạt động</label>
                            <select className="input-pro" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value, material_name: '', gcpWarning: false })}>
                                <option value="Fertilizer">Bón phân (Fertilizing)</option>
                                <option value="Pesticide">Phun thuốc (Pest Control)</option>
                                <option value="Irrigation">Tưới nước (Irrigation)</option>
                                <option value="Weeding">Làm cỏ (Weeding)</option>
                                <option value="Pruning">Tỉa cành (Pruning)</option>
                                <option value="Harvest">Thu hoạch (Harvest)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>{formData.type === 'Pesticide' ? 'Tên thuốc bảo vệ thực vật' : formData.type === 'Fertilizer' ? 'Tên loại phân bón' : 'Nội dung thực hiện'}</label>
                        <input className="input-pro" value={formData.material_name} onChange={handleMaterialChange} placeholder="Nhập tên vật tư hoặc hoạt động..." />

                        {gcpWarning && (
                            <div style={{ marginTop: '10px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '12px', border: '1px solid #fca5a5' }}>
                                <i className="fas fa-skull-crossbones"></i> <strong>CẢNH BÁO:</strong> Thuốc này có thể không nằm trong danh mục "Sạch" của GCP. Vui lòng kiểm tra lại tiêu chuẩn bền vững trước khi sử dụng.
                            </div>
                        )}
                        {!gcpWarning && formData.type === 'Pesticide' && formData.material_name && (
                            <div style={{ marginTop: '10px', padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', fontSize: '12px', border: '1px solid #a7f3d0' }}>
                                <i className="fas fa-shield-alt"></i> Thuốc nằm trong danh mục tuân thủ an toàn GCP.
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>Liều lượng / Số lượng</label>
                            <input className="input-pro" type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Đơn vị tính</label>
                            <input className="input-pro" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                        </div>
                    </div>

                    {formData.type === 'Pesticide' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Lý do xịt (Sâu/Bệnh)</label>
                                <input className="input-pro" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Thời gian cách ly (PHI - Ngày)</label>
                                <input className="input-pro" type="number" value={formData.phi} onChange={e => setFormData({ ...formData, phi: e.target.value })} />
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                        <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                            <i className="fas fa-check"></i> XÁC NHẬN GHI NHẬT KÝ
                        </button>
                        <button className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                            HỦY
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnualActivities;
