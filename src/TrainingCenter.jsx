import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations';
import './Dashboard.css';

const TrainingCenter = ({ onBack, devUser, appLang = 'vi' }) => {
    const t = translations[appLang] || translations.vi;
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
            alert(t.save_success || 'Saved successfully.');
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
            alert(t.save_success || 'Saved successfully.');
            setShowForm(false);
            fetchData();
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
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                    <i className="fas fa-plus-circle"></i> {t.train_add_btn}
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
                    <i className="fas fa-graduation-cap"></i> {t.train_tab_diary}
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
                    <i className="fas fa-seedling"></i> {t.train_tab_tree}
                </button>
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>
                            <i className={activeTab === 'training' ? "fas fa-chalkboard-teacher" : "fas fa-tree"} style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>
                            {activeTab === 'training' ? t.train_history_title : t.train_tree_title}
                        </h3>
                    </div>

                    <table className="pro-table">
                        <thead>
                            {activeTab === 'training' ? (
                                <tr>
                                    <th>{t.train_date}</th>
                                    <th>{t.train_topic}</th>
                                    <th>{t.train_loc}</th>
                                    <th>{t.train_level}</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>{t.act_date}</th>
                                    <th>{t.train_tree_type}</th>
                                    <th>{t.train_quantity}</th>
                                    <th>{t.train_survival}</th>
                                    <th>{t.train_status}</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                            ) : activeTab === 'training' ? (
                                trainings.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center' }}>{t.loading}</td></tr> :
                                    trainings.map(t_row => (
                                        <tr key={t_row.id}>
                                            <td>{t_row.training_date}</td>
                                            <td style={{ fontWeight: 600 }}>{t_row.topic}</td>
                                            <td>{t_row.location}</td>
                                            <td><span className="badge">{t_row.application_level}</span></td>
                                        </tr>
                                    ))
                            ) : (
                                trees.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center' }}>{t.loading}</td></tr> :
                                    trees.map(t_row => (
                                        <tr key={t_row.id}>
                                            <td>{t_row.received_date}</td>
                                            <td style={{ fontWeight: 600 }}>{t_row.tree_type}</td>
                                            <td>{t_row.quantity}</td>
                                            <td>{t_row.survival_rate}%</td>
                                            <td><span className={`status-pill ${t_row.status.toLowerCase()}`}>{t_row.status}</span></td>
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
                        {activeTab === 'training' ? ` ${t.train_form_train}` : ` ${t.train_form_tree}`}
                    </h2>

                    {activeTab === 'training' ? (
                        <form onSubmit={handleSaveTraining}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>{t.train_topic}</label>
                                    <select className="input-pro" value={trainingForm.topic} onChange={e => setTrainingForm({ ...trainingForm, topic: e.target.value })}>
                                        <option>Kỹ thuật bón phân tiết kiệm</option>
                                        <option>Quản lý rây rệp mùa khô</option>
                                        <option>Kỹ thuật ghép cải tạo</option>
                                        <option>Thu hoạch & bảo quản sau thu hoạch</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t.train_date}</label>
                                    <input type="date" className="input-pro" value={trainingForm.date} onChange={e => setTrainingForm({ ...trainingForm, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>{t.train_loc}</label>
                                    <input className="input-pro" value={trainingForm.location} onChange={e => setTrainingForm({ ...trainingForm, location: e.target.value })} placeholder="VD: Thôn 1..." />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>{t.train_level}</label>
                                    <select className="input-pro" value={trainingForm.level} onChange={e => setTrainingForm({ ...trainingForm, level: e.target.value })}>
                                        <option value="Chưa áp dụng">{t.train_level_options?.none || 'Chưa áp dụng'}</option>
                                        <option value="Một phần">{t.train_level_options?.partial || 'Một phần (Đang thử nghiệm)'}</option>
                                        <option value="Toàn bộ">{t.train_level_options?.full || 'Toàn bộ (Đã triển khai)'}</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                                <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>{isLoading ? t.loading : t.save}</button>
                                <button type="button" className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>{t.cancel}</button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSaveTree}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>{t.train_tree_type}</label>
                                    <select className="input-pro" value={treeForm.type} onChange={e => setTreeForm({ ...treeForm, type: e.target.value })}>
                                        <option>Cà phê TR4</option>
                                        <option>Sầu riêng Musang King</option>
                                        <option>Mắc ca OC</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t.train_quantity}</label>
                                    <input type="number" className="input-pro" required value={treeForm.quantity} onChange={e => setTreeForm({ ...treeForm, quantity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>{t.act_date}</label>
                                    <input type="date" className="input-pro" value={treeForm.date} onChange={e => setTreeForm({ ...treeForm, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>{t.train_survival}</label>
                                    <input type="number" className="input-pro" value={treeForm.survival} onChange={e => setTreeForm({ ...treeForm, survival: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>{t.train_status}</label>
                                    <select className="input-pro" value={treeForm.status} onChange={e => setTreeForm({ ...treeForm, status: e.target.value })}>
                                        <option value="Healthy">{t.train_status_options?.healthy || 'Phát triển tốt'}</option>
                                        <option value="Stunted">{t.train_status_options?.stunted || 'Bị chững, chậm phát triển'}</option>
                                        <option value="Died">{t.train_status_options?.died || 'Đã chết / Cần trồng dặm'}</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                                <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>{isLoading ? t.loading : t.save}</button>
                                <button type="button" className="btn-primary" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>{t.cancel}</button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrainingCenter;
