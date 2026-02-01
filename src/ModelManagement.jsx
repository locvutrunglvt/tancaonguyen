import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';

const ModelManagement = ({ onBack, devUser }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
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

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || devUser?.id;

        const { error } = await supabase.from('coffee_models').insert([{
            ...currentModel,
            user_id: userId
        }]);

        if (error) alert(error.message);
        else {
            alert('Đã thêm mô hình mới.');
            setShowModal(false);
            fetchModels();
        }
        setLoading(false);
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> Quay lại
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-add-user"
                    style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--tcn-dark)', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <i className="fas fa-plus"></i> THÊM MÔ HÌNH MỚI
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3>Danh sách Mô hình trình diễn</h3>
                    <div className="badge">{models.length} mô hình</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>Tên mô hình</th>
                            <th>Địa điểm</th>
                            <th>Loại cà phê</th>
                            <th>Diện tích</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && models.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
                        ) : models.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', opacity: 0.5 }}>Chưa có mô hình nào.</td></tr>
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
                                    <td>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--tcn-deep)', cursor: 'pointer' }}><i className="fas fa-info-circle"></i></button>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--coffee-medium)', cursor: 'pointer' }}><i className="fas fa-edit"></i></button>
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
                        <h3 style={{ marginBottom: '25px', color: 'var(--tcn-dark)' }}>Thiết lập Mô hình mới</h3>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Tên mô hình</label>
                                    <input className="input-pro" required value={currentModel.name} onChange={e => setCurrentModel({ ...currentModel, name: e.target.value })} placeholder="VD: Mô hình trình diễn thích ứng 01" />
                                </div>
                                <div className="form-group">
                                    <label>Địa điểm triển khai</label>
                                    <input className="input-pro" value={currentModel.location} onChange={e => setCurrentModel({ ...currentModel, location: e.target.value })} placeholder="Xã, Huyện, Tỉnh" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>Loại cà phê</label>
                                        <select className="input-pro" value={currentModel.coffee_type} onChange={e => setCurrentModel({ ...currentModel, coffee_type: e.target.value })}>
                                            <option>Robusta</option>
                                            <option>Arabica</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Diện tích (ha)</label>
                                        <input className="input-pro" type="number" step="0.1" value={currentModel.area} onChange={e => setCurrentModel({ ...currentModel, area: e.target.value })} />
                                    </div>
                                </div>
                                <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? 'ĐANG LƯU...' : 'LƯU DỮ LIỆU'}</button>
                                    <button type="button" className="btn-primary" style={{ flex: 1, background: '#f1f5f9', color: '#475569' }} onClick={() => setShowModal(false)}>Hủy bỏ</button>
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
