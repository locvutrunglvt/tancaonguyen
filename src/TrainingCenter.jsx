import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';

const TrainingCenter = ({ onBack, devUser }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('training'); // training, support
    const [trainings, setTrainings] = useState([]);
    const [trees, setTrees] = useState([]);
    const [showForm, setShowForm] = useState(false);

    // Form states
    const [trainingForm, setTrainingForm] = useState({
        topic: 'Kỹ thuật bón phân tiết kiệm',
        date: new Date().toISOString().split('T')[0],
        location: '',
        level: 'Một phần'
    });

    const [treeForm, setTreeForm] = useState({
        type: 'Cà phê TR4',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        survival: '100',
        status: 'Healthy'
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'training') {
                const { data, error } = await supabase.from('training_records').select('*').order('training_date', { ascending: false });
                if (error) throw error;
                setTrainings(data || []);
            } else {
                const { data, error } = await supabase.from('tree_support').select('*').order('received_date', { ascending: false });
                if (error) throw error;
                setTrees(data || []);
            }
        } catch (err) {
            console.error('Error fetching data:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTraining = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || devUser?.id;

        const { error } = await supabase.from('training_records').insert([{
            user_id: userId,
            topic: trainingForm.topic,
            training_date: trainingForm.date,
            location: trainingForm.location,
            application_level: trainingForm.level
        }]);

        if (error) alert(error.message);
        else {
            alert('Đã lưu lịch sử tập huấn.');
            setShowForm(false);
            fetchData();
        }
        setIsLoading(false);
    };

    const handleSaveTree = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || devUser?.id;

        const { error } = await supabase.from('tree_support').insert([{
            user_id: userId,
            tree_type: treeForm.type,
            quantity: parseInt(treeForm.quantity) || 0,
            received_date: treeForm.date,
            survival_rate: parseInt(treeForm.survival) || 0,
            status: treeForm.status
        }]);

        if (error) alert(error.message);
        else {
            alert('Đã cập nhật dữ liệu cây hỗ trợ.');
            setShowForm(false);
            fetchData();
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
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                    <i className="fas fa-plus-circle"></i> THÊM BẢN GHI MỚI
                </button>
            </div>

            <div className="tabs" style={{ display: 'flex', gap: '5px', marginBottom: '20px', background: '#f8fafc', padding: '5px', borderRadius: '15px', width: 'fit-content' }}>
                <button
                    onClick={() => { setActiveTab('training'); setShowForm(false); }}
                    style={{
                        padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'training' ? 'white' : 'transparent',
                        boxShadow: activeTab === 'training' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                        fontWeight: activeTab === 'training' ? 600 : 400,
                        color: activeTab === 'training' ? 'var(--tcn-dark)' : '#64748b'
                    }}
                >
                    <i className="fas fa-graduation-cap"></i> Nhật ký Tập huấn
                </button>
                <button
                    onClick={() => { setActiveTab('support'); setShowForm(false); }}
                    style={{
                        padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'support' ? 'white' : 'transparent',
                        boxShadow: activeTab === 'support' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                        fontWeight: activeTab === 'support' ? 600 : 400,
                        color: activeTab === 'support' ? 'var(--tcn-dark)' : '#64748b'
                    }}
                >
                    <i className="fas fa-seedling"></i> Cây hỗ trợ (FCV)
                </button>
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>{activeTab === 'training' ? 'Lịch sử nâng cao năng lực' : 'Theo dõi sinh trưởng cây dự án'}</h3>
                        <div className="badge">Nhóm D: Hỗ trợ cộng đồng</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            {activeTab === 'training' ? (
                                <tr>
                                    <th>Ngày tập huấn</th>
                                    <th>Chủ đề</th>
                                    <th>Địa điểm</th>
                                    <th>Mức độ áp dụng</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>Ngày nhận</th>
                                    <th>Loại cây</th>
                                    <th>Số lượng</th>
                                    <th>Tỷ lệ sống</th>
                                    <th>Tình trạng</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Đang tải...</td></tr>
                            ) : activeTab === 'training' ? (
                                trainings.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>Chưa có dữ liệu.</td></tr> :
                                    trainings.map(t => (
                                        <tr key={t.id}>
                                            <td>{t.training_date}</td>
                                            <td style={{ fontWeight: 600 }}>{t.topic}</td>
                                            <td>{t.location}</td>
                                            <td><span className="badge">{t.application_level}</span></td>
                                        </tr>
                                    ))
                            ) : (
                                trees.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center' }}>Chưa có dữ liệu.</td></tr> :
                                    trees.map(t => (
                                        <tr key={t.id}>
                                            <td>{t.received_date}</td>
                                            <td style={{ fontWeight: 600 }}>{t.tree_type}</td>
                                            <td>{t.quantity} cây</td>
                                            <td>{t.survival_rate}%</td>
                                            <td><span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span></td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="form-container" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                    <h2 style={{ marginBottom: '25px', color: 'var(--tcn-dark)', borderBottom: '2px solid var(--tcn-light)', paddingBottom: '10px' }}>
                        <i className={`fas ${activeTab === 'training' ? 'fa-graduation-cap' : 'fa-seedling'}`}></i>
                        {activeTab === 'training' ? ' Ghi nhận buổi tập huấn mới' : ' Cập nhật tình trạng cây hỗ trợ'}
                    </h2>

                    {activeTab === 'training' ? (
                        <form onSubmit={handleSaveTraining}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Chủ đề tập huấn</label>
                                    <select className="input-pro" value={trainingForm.topic} onChange={e => setTrainingForm({ ...trainingForm, topic: e.target.value })}>
                                        <option>Kỹ thuật bón phân tiết kiệm</option>
                                        <option>Quản lý rây rệp mùa khô</option>
                                        <option>Kỹ thuật ghép cải tạo</option>
                                        <option>Thu hoạch & bảo quản sau thu hoạch</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ngày tập huấn</label>
                                    <input type="date" className="input-pro" value={trainingForm.date} onChange={e => setTrainingForm({ ...trainingForm, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Địa điểm</label>
                                    <input className="input-pro" value={trainingForm.location} onChange={e => setTrainingForm({ ...trainingForm, location: e.target.value })} placeholder="VD: Nhà văn hóa Thôn 1..." />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Mức độ áp dụng vào vườn nhà</label>
                                    <select className="input-pro" value={trainingForm.level} onChange={e => setTrainingForm({ ...trainingForm, level: e.target.value })}>
                                        <option>Chưa áp dụng</option>
                                        <option>Một phần (Đang thử nghiệm)</option>
                                        <option>Toàn bộ (Đã triển khai)</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                                <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>{isLoading ? 'ĐANG LƯU...' : 'LƯU KẾT QUẢ'}</button>
                                <button type="button" className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>HỦY</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSaveTree}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Loại cây nhận hỗ trợ</label>
                                    <select className="input-pro" value={treeForm.type} onChange={e => setTreeForm({ ...treeForm, type: e.target.value })}>
                                        <option>Cà phê TR4</option>
                                        <option>Sầu riêng Musang King</option>
                                        <option>Mắc ca OC</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số lượng (cây)</label>
                                    <input type="number" className="input-pro" required value={treeForm.quantity} onChange={e => setTreeForm({ ...treeForm, quantity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Ngày nhận</label>
                                    <input type="date" className="input-pro" value={treeForm.date} onChange={e => setTreeForm({ ...treeForm, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Tỷ lệ sống (%)</label>
                                    <input type="number" className="input-pro" value={treeForm.survival} onChange={e => setTreeForm({ ...treeForm, survival: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Tình trạng sinh trưởng</label>
                                    <select className="input-pro" value={treeForm.status} onChange={e => setTreeForm({ ...treeForm, status: e.target.value })}>
                                        <option value="Healthy">Phát triển tốt</option>
                                        <option value="Stunted">Bị chững, chậm phát triển</option>
                                        <option value="Died">Đã chết / Cần trồng dặm</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                                <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>{isLoading ? 'ĐANG LƯU...' : 'LƯU DỮ LIỆU'}</button>
                                <button type="button" className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>HỦY</button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrainingCenter;
