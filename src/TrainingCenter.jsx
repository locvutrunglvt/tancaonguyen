import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { translations } from './translations';
import './Dashboard.css';

const TrainingCenter = ({ onBack, devUser, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [trainings, setTrainings] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Detail View State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState(null);

    const [trainingForm, setTrainingForm] = useState({
        farmer_id: '',
        topic: 'Kỹ thuật bón phân tiết kiệm',
        training_date: new Date().toISOString().split('T')[0],
        location: '',
        trainer: '',
        duration_hours: '',
        participants_count: 1,
        application_level: 'partial',
        feedback: '',
        notes: ''
    });

    useEffect(() => {
        fetchFarmers();
        fetchTrainings();
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

    const fetchTrainings = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('training_records')
                .select(`
                    *,
                    farmer:farmers(farmer_code, full_name, village)
                `)
                .order('training_date', { ascending: false });

            if (error) throw error;
            setTrainings(data || []);
        } catch (err) {
            console.error('Error fetching trainings:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                farmer_id: trainingForm.farmer_id,
                topic: trainingForm.topic,
                training_date: trainingForm.training_date,
                location: trainingForm.location,
                trainer: trainingForm.trainer,
                duration_hours: parseFloat(trainingForm.duration_hours) || null,
                participants_count: parseInt(trainingForm.participants_count) || 1,
                application_level: trainingForm.application_level,
                feedback: trainingForm.feedback,
                notes: trainingForm.notes
            };

            if (isEditing) {
                const { error } = await supabase
                    .from('training_records')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                alert(t.save_success || 'Cập nhật thành công.');
            } else {
                const { error } = await supabase
                    .from('training_records')
                    .insert([payload]);

                if (error) throw error;
                alert(t.save_success || 'Lưu thành công.');
            }

            handleFormClose();
            fetchTrainings();
        } catch (error) {
            alert((t.save_error || 'Lỗi: ') + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (training) => {
        setTrainingForm({
            farmer_id: training.farmer_id,
            topic: training.topic,
            training_date: training.training_date,
            location: training.location || '',
            trainer: training.trainer || '',
            duration_hours: training.duration_hours || '',
            participants_count: training.participants_count || 1,
            application_level: training.application_level || 'partial',
            feedback: training.feedback || '',
            notes: training.notes || ''
        });
        setIsEditing(true);
        setEditingId(training.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.delete_confirm || 'Xác nhận xóa?')) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('training_records').delete().eq('id', id);
            if (error) throw error;
            alert(t.delete_success || 'Đã xóa thành công.');
            fetchTrainings();
        } catch (error) {
            alert(`Lỗi: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleView = (training) => {
        setSelectedTraining(training);
        setShowDetailModal(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditingId(null);
        setTrainingForm({
            farmer_id: '',
            topic: 'Kỹ thuật bón phân tiết kiệm',
            training_date: new Date().toISOString().split('T')[0],
            location: '',
            trainer: '',
            duration_hours: '',
            participants_count: 1,
            application_level: 'partial',
            feedback: '',
            notes: ''
        });
    };

    const canEdit = () => {
        if (!currentUser) return false;
        return currentUser.role === 'Admin';
    };

    const getApplicationLevelBadge = (level) => {
        const styles = {
            none: { bg: '#fee2e2', color: '#991b1b', text: 'Chưa áp dụng' },
            partial: { bg: '#fef3c7', color: '#92400e', text: 'Một phần' },
            full: { bg: '#dcfce7', color: '#166534', text: 'Toàn bộ' }
        };
        const style = styles[level] || styles.partial;
        return (
            <span style={{
                background: style.bg,
                color: style.color,
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
            }}>
                {style.text}
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
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                    <i className="fas fa-plus-circle"></i> {t.train_add_btn || 'THÊM ĐÀO TẠO'}
                </button>
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>
                            <i className="fas fa-chalkboard-teacher" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>
                            {t.train_history_title || 'Lịch sử đào tạo'}
                        </h3>
                        <div className="badge">{trainings.length} buổi đào tạo</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>Mã nông dân</th>
                                <th>Tên nông dân</th>
                                <th>Ngày đào tạo</th>
                                <th>Chủ đề</th>
                                <th>Địa điểm</th>
                                <th>Thời lượng (h)</th>
                                <th>Mức độ áp dụng</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                            ) : trainings.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', opacity: 0.5 }}>Chưa có buổi đào tạo nào</td></tr>
                            ) : (
                                trainings.map(training => (
                                    <tr key={training.id} onClick={() => handleView(training)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>{training.farmer?.farmer_code}</span></td>
                                        <td style={{ fontWeight: 600 }}>{training.farmer?.full_name}</td>
                                        <td>{training.training_date}</td>
                                        <td><strong>{training.topic}</strong></td>
                                        <td>{training.location || '-'}</td>
                                        <td>{training.duration_hours || '-'}</td>
                                        <td>{getApplicationLevelBadge(training.application_level)}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* VIEW BUTTON (Always visible) */}
                                                <button onClick={() => handleView(training)} style={{
                                                    background: '#e0f2fe', border: '1px solid #7dd3fc',
                                                    color: '#0369a1', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }} title="Xem chi tiết">
                                                    <i className="fas fa-eye"></i>
                                                </button>

                                                {canEdit() && (
                                                    <>
                                                        <button onClick={() => handleEdit(training)} style={{
                                                            background: '#fef3c7', border: '1px solid #d97706',
                                                            color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }} title={t.edit || "Sửa"}>
                                                            <i className="fas fa-pen"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(training.id)} style={{
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
                        <i className="fas fa-graduation-cap"></i> {isEditing ? 'Cập nhật đào tạo' : 'Thêm buổi đào tạo mới'}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Chọn nông dân *</label>
                                <select
                                    className="input-pro"
                                    required
                                    value={trainingForm.farmer_id}
                                    onChange={e => setTrainingForm({ ...trainingForm, farmer_id: e.target.value })}
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
                                <label>Ngày đào tạo *</label>
                                <input className="input-pro" type="date" value={trainingForm.training_date} onChange={e => setTrainingForm({ ...trainingForm, training_date: e.target.value })} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Chủ đề đào tạo *</label>
                            <select className="input-pro" value={trainingForm.topic} onChange={e => setTrainingForm({ ...trainingForm, topic: e.target.value })} required>
                                <option>Kỹ thuật bón phân tiết kiệm</option>
                                <option>Quản lý rầy rệp mùa khô</option>
                                <option>Kỹ thuật ghép cải tạo</option>
                                <option>Thu hoạch & bảo quản sau thu hoạch</option>
                                <option>Quản lý dịch hại tổng hợp (IPM)</option>
                                <option>Kỹ thuật tưới tiết kiệm nước</option>
                                <option>Chứng nhận bền vững (UTZ, 4C, Organic)</option>
                                <option>Quản lý tài chính trang trại</option>
                                <option>Thích ứng biến đổi khí hậu</option>
                                <option>Khác</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Địa điểm</label>
                                <input className="input-pro" value={trainingForm.location} onChange={e => setTrainingForm({ ...trainingForm, location: e.target.value })} placeholder="Nhà văn hóa thôn..." />
                            </div>
                            <div className="form-group">
                                <label>Thời lượng (giờ)</label>
                                <input className="input-pro" type="number" step="0.5" value={trainingForm.duration_hours} onChange={e => setTrainingForm({ ...trainingForm, duration_hours: e.target.value })} placeholder="2" />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Giảng viên</label>
                                <input className="input-pro" value={trainingForm.trainer} onChange={e => setTrainingForm({ ...trainingForm, trainer: e.target.value })} placeholder="Tên giảng viên..." />
                            </div>
                            <div className="form-group">
                                <label>Số người tham gia</label>
                                <input className="input-pro" type="number" value={trainingForm.participants_count} onChange={e => setTrainingForm({ ...trainingForm, participants_count: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Mức độ áp dụng *</label>
                            <select className="input-pro" value={trainingForm.application_level} onChange={e => setTrainingForm({ ...trainingForm, application_level: e.target.value })} required>
                                <option value="none">Chưa áp dụng</option>
                                <option value="partial">Một phần (Đang thử nghiệm)</option>
                                <option value="full">Toàn bộ (Đã triển khai)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Phản hồi của nông dân</label>
                            <textarea className="input-pro" rows="2" value={trainingForm.feedback} onChange={e => setTrainingForm({ ...trainingForm, feedback: e.target.value })} placeholder="Phản hồi về buổi đào tạo..."></textarea>
                        </div>

                        <div className="form-group">
                            <label>Ghi chú</label>
                            <textarea className="input-pro" rows="2" value={trainingForm.notes} onChange={e => setTrainingForm({ ...trainingForm, notes: e.target.value })} placeholder="Ghi chú thêm..."></textarea>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 1 }}>
                                {isLoading ? t.loading : (isEditing ? 'CẬP NHẬT' : 'THÊM ĐÀO TẠO')}
                            </button>
                            <button type="button" className="btn-primary" onClick={handleFormClose} style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                                {t.cancel}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TRAINING DETAIL MODAL */}
            {showDetailModal && selectedTraining && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px' }}>
                                <i className="fas fa-graduation-cap" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                                Chi tiết đào tạo
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Section 1: Session Info */}
                            <div className="detail-section" style={{ gridColumn: 'span 2' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Thông tin buổi học</h4>
                            </div>

                            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Chủ đề</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)', fontSize: '16px' }}>{selectedTraining.topic}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Ngày thực hiện</label>
                                <div>{new Date(selectedTraining.training_date).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Địa điểm</label>
                                <div>{selectedTraining.location || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Giảng viên</label>
                                <div>{selectedTraining.trainer || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Thời lượng</label>
                                <div>{selectedTraining.duration_hours ? `${selectedTraining.duration_hours} giờ` : '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Số người tham gia</label>
                                <div>{selectedTraining.participants_count} người</div>
                            </div>

                            {/* Section 2: Trainee Info */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Người tham gia</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Tên nông dân</label>
                                <div style={{ fontWeight: 600 }}>{selectedTraining.farmer?.full_name}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Mã nông dân</label>
                                <div style={{ fontFamily: 'monospace' }}>{selectedTraining.farmer?.farmer_code}</div>
                            </div>

                            {/* Section 3: Result */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>Kết quả & Đánh giá</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Mức độ áp dụng</label>
                                <div>{getApplicationLevelBadge(selectedTraining.application_level)}</div>
                            </div>

                            {selectedTraining.feedback && (
                                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Phản hồi của học viên</label>
                                    <div style={{ fontStyle: 'italic', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>"{selectedTraining.feedback}"</div>
                                </div>
                            )}

                            {selectedTraining.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Ghi chú</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedTraining.notes}</div>
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

export default TrainingCenter;
