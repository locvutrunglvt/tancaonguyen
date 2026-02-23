import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import MediaUpload, { getFileUrl, uploadFileToPB } from './MediaUpload';
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
    const [pendingFiles, setPendingFiles] = useState([]);

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
        notes: '',
        photo_preview: ''
    });

    useEffect(() => {
        fetchFarmers();
        fetchTrainings();
    }, []);

    const fetchFarmers = async () => {
        try {
            const data = await pb.collection('farmers').getFullList({ filter: "status='active'", sort: 'full_name' });
            setFarmers(data || []);
        } catch (err) {
            console.error('Error fetching farmers:', err.message);
        }
    };

    const fetchTrainings = async () => {
        setIsLoading(true);
        try {
            const data = await pb.collection('training_records').getFullList({ expand: 'farmer_id', sort: '-training_date' });
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

            let recordId;
            if (isEditing) {
                await pb.collection('training_records').update(editingId, payload);
                recordId = editingId;
            } else {
                const record = await pb.collection('training_records').create(payload);
                recordId = record.id;
            }

            if (pendingFiles.length > 0 && recordId) {
                await uploadFileToPB('training_records', recordId, 'photo', pendingFiles);
            }

            alert(t.save_success);
            handleFormClose();
            fetchTrainings();
        } catch (error) {
            alert(t.save_error + ': ' + error.message);
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
            notes: training.notes || '',
            photo_preview: training.photo && training.photo.length > 0 ? training.photo.map(f => getFileUrl(training, f)).join(',') : ''
        });
        setPendingFiles([]);
        setIsEditing(true);
        setEditingId(training.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.delete_confirm)) return;
        setIsLoading(true);
        try {
            await pb.collection('training_records').delete(id);
            alert(t.delete_success);
            fetchTrainings();
        } catch (error) {
            alert(`Error: ${error.message}`);
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
            notes: '',
            photo_preview: ''
        });
        setPendingFiles([]);
    };

    const canEdit = () => {
        if (!currentUser) return false;
        return currentUser.role === 'Admin';
    };

    const getTrainingTopicText = (topic) => {
        const topicsMap = {
            'Kỹ thuật bón phân tiết kiệm': t.train_topic_1,
            'Quản lý rầy rệp mùa khô': t.train_topic_2,
            'Kỹ thuật ghép cải tạo': t.train_topic_3,
            'Thu hoạch & bảo quản sau thu hoạch': t.train_topic_4,
            'Quản lý dịch hại tổng hợp (IPM)': t.train_topic_5,
            'Kỹ thuật tưới tiết kiệm nước': t.train_topic_6,
            'Chứng nhận bền vững (UTZ, 4C, Organic)': t.train_topic_7,
            'Quản lý tài chính trang trại': t.train_topic_8,
            'Thích ứng biến đổi khí hậu': t.train_topic_9
        };
        return topicsMap[topic] || topic;
    };

    const getApplicationLevelBadge = (level) => {
        const styles = {
            none: { bg: '#fee2e2', color: '#991b1b', text: t.train_app_none },
            partial: { bg: '#fef3c7', color: '#92400e', text: t.train_app_partial },
            full: { bg: '#dcfce7', color: '#166534', text: t.train_app_full }
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
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}></div>
                <button onClick={() => setShowForm(true)} className="btn-primary">
                    <i className="fas fa-plus-circle"></i> {(t.train_add_btn || 'THÊM ĐÀO TẠO').toUpperCase()}
                </button>
            </div>

            {!showForm ? (
                <div className="data-table-container">
                    <div className="table-header">
                        <h3>
                            <i className="fas fa-chalkboard-teacher" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>
                            {t.train_list_title}
                        </h3>
                        <div className="badge">{trainings.length} {t.training?.toLowerCase()}</div>
                    </div>

                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>{t.farmer_code}</th>
                                <th>{t.farmer_name}</th>
                                <th>{t.date}</th>
                                <th>{t.train_topic}</th>
                                <th>{t.location}</th>
                                <th>{appLang === 'vi' ? 'Thời lượng' : appLang === 'en' ? 'Duration' : 'Hruê hriăm'}</th>
                                <th>{t.train_level}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                            ) : trainings.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data}</td></tr>
                            ) : (
                                trainings.map(training => (
                                    <tr key={training.id} onClick={() => handleView(training)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>{training.expand?.farmer_id?.farmer_code}</span></td>
                                        <td style={{ fontWeight: 600 }}>{training.expand?.farmer_id?.full_name}</td>
                                        <td>{training.training_date}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {training.photo && training.photo.length > 0 && <img src={getFileUrl(training, training.photo[0])} alt="Training" style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />}
                                                {getTrainingTopicText(training.topic)}
                                            </div>
                                        </td>
                                        <td>{training.location || '-'}</td>
                                        <td>{training.duration_hours || '-'}</td>
                                        <td>{getApplicationLevelBadge(training.application_level)}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* VIEW BUTTON (Always visible) */}
                                                <button onClick={() => handleView(training)} className="btn-icon btn-view" title={t.details}>
                                                    <i className="fas fa-eye"></i>
                                                </button>

                                                {canEdit() && (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={() => handleEdit(training)} className="btn-icon btn-edit" title={t.edit}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(training.id)} className="btn-icon btn-delete" title={t.delete}>
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </div>
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
                        <i className="fas fa-graduation-cap"></i> {isEditing ? (t.update + ' ' + t.training?.toLowerCase()) : t.train_add_btn}
                    </h2>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{appLang === 'vi' ? 'Chọn nông dân' : appLang === 'en' ? 'Select Farmer' : 'Hriêng nông dân'} *</label>
                                <select
                                    className="input-pro"
                                    required
                                    value={trainingForm.farmer_id}
                                    onChange={e => setTrainingForm({ ...trainingForm, farmer_id: e.target.value })}
                                >
                                    <option value="">-- {appLang === 'vi' ? 'Chọn nông dân' : appLang === 'en' ? 'Select Farmer' : 'Hriêng nông dân'} --</option>
                                    {farmers.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.farmer_code} - {f.full_name} ({f.village})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t.date} *</label>
                                <input className="input-pro" type="date" value={trainingForm.training_date} onChange={e => setTrainingForm({ ...trainingForm, training_date: e.target.value })} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.topic} *</label>
                            <select className="input-pro" value={trainingForm.topic} onChange={e => setTrainingForm({ ...trainingForm, topic: e.target.value })} required>
                                <option value="Kỹ thuật bón phân tiết kiệm">{t.train_topic_1}</option>
                                <option value="Quản lý rầy rệp mùa khô">{t.train_topic_2}</option>
                                <option value="Kỹ thuật ghép cải tạo">{t.train_topic_3}</option>
                                <option value="Thu hoạch & bảo quản sau thu hoạch">{t.train_topic_4}</option>
                                <option value="Quản lý dịch hại tổng hợp (IPM)">{t.train_topic_5}</option>
                                <option value="Kỹ thuật tưới tiết kiệm nước">{t.train_topic_6}</option>
                                <option value="Chứng nhận bền vững (UTZ, 4C, Organic)">{t.train_topic_7}</option>
                                <option value="Quản lý tài chính trang trại">{t.train_topic_8}</option>
                                <option value="Thích ứng biến đổi khí hậu">{t.train_topic_9}</option>
                                <option value="Khác">{t.act_type_other}</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{t.location}</label>
                                <input className="input-pro" value={trainingForm.location} onChange={e => setTrainingForm({ ...trainingForm, location: e.target.value })} placeholder={t.location + '...'} />
                            </div>
                            <div className="form-group">
                                <label>{t.duration_hours}</label>
                                <input className="input-pro" type="number" step="0.5" value={trainingForm.duration_hours} onChange={e => setTrainingForm({ ...trainingForm, duration_hours: e.target.value })} placeholder="2" />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>{appLang === 'vi' ? 'Giảng viên' : appLang === 'en' ? 'Trainer' : 'Khua mdrông'} </label>
                                <input className="input-pro" value={trainingForm.trainer} onChange={e => setTrainingForm({ ...trainingForm, trainer: e.target.value })} placeholder={t.search_placeholder} />
                            </div>
                            <div className="form-group">
                                <label>{appLang === 'vi' ? 'Số người tham gia' : appLang === 'en' ? 'Participants Count' : 'Sô phung tham gia'}</label>
                                <input className="input-pro" type="number" value={trainingForm.participants_count} onChange={e => setTrainingForm({ ...trainingForm, participants_count: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t.application_level} *</label>
                            <select className="input-pro" value={trainingForm.application_level} onChange={e => setTrainingForm({ ...trainingForm, application_level: e.target.value })} required>
                                <option value="none">{t.train_app_none}</option>
                                <option value="partial">{t.train_app_partial}</option>
                                <option value="full">{t.train_app_full}</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>{appLang === 'vi' ? 'Phản hồi của nông dân' : appLang === 'en' ? 'Farmer Feedback' : 'Klei hơ mơ nông dân'}</label>
                            <textarea className="input-pro" rows="2" value={trainingForm.feedback} onChange={e => setTrainingForm({ ...trainingForm, feedback: e.target.value })} placeholder={t.notes + '...'}></textarea>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>{t.notes}</label>
                            <textarea className="input-pro" rows="3" value={trainingForm.notes} onChange={e => setTrainingForm({ ...trainingForm, notes: e.target.value })} placeholder={t.notes + '...'}></textarea>
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>{appLang === 'vi' ? 'Ảnh buổi tập huấn/cấp phát' : appLang === 'en' ? 'Training/Distribution Photo' : 'Ảnh tập huấn'}</label>
                            <MediaUpload
                                entityType="training"
                                entityId={isEditing ? editingId : 'new'}
                                currentUrl={trainingForm.photo_preview}
                                onUploadSuccess={(url, file) => { setTrainingForm({ ...trainingForm, photo_preview: url }); if (file) setPendingFiles(prev => [...prev, file]); }}
                                appLang={appLang}
                                allowMultiple={true}
                            />
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary" disabled={isLoading}>
                                <i className="fas fa-save"></i> {isLoading ? t.loading : (isEditing ? t.update.toUpperCase() : t.add.toUpperCase())}
                            </button>
                            <button type="button" className="btn-primary" onClick={handleFormClose} style={{ background: '#f1f5f9', color: '#475569' }}>
                                <i className="fas fa-undo"></i> {t.cancel.toUpperCase()}
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
                                {t.train_title}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        {selectedTraining.photo && selectedTraining.photo.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
                                {selectedTraining.photo.map((filename, idx) => {
                                    const url = getFileUrl(selectedTraining, filename);
                                    const fname = filename.toLowerCase();
                                    return (
                                        <div key={idx} style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                                            {fname.endsWith('.mp4') || fname.endsWith('.mov') || fname.endsWith('.webm') ? (
                                                <video src={url} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '15px' }} />
                                            ) : (
                                                <img src={url} alt={`Training ${idx}`} style={{ width: '100%', maxHeight: '200px', borderRadius: '15px', objectFit: 'cover' }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Section 1: Session Info */}
                            <div className="detail-section" style={{ gridColumn: 'span 2' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.general_info}</h4>
                            </div>

                            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.topic}</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)', fontSize: '16px' }}>{getTrainingTopicText(selectedTraining.topic)}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.date}</label>
                                <div>{new Date(selectedTraining.training_date).toLocaleDateString(appLang === 'en' ? 'en-US' : 'vi-VN')}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.location}</label>
                                <div>{selectedTraining.location || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Giảng viên' : appLang === 'en' ? 'Trainer' : 'Khua mdrông'}</label>
                                <div>{selectedTraining.trainer || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.duration_hours}</label>
                                <div>{selectedTraining.duration_hours ? `${selectedTraining.duration_hours} ${appLang === 'vi' ? 'giờ' : 'hours'}` : '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Số người tham gia' : appLang === 'en' ? 'Participants' : 'Sô phung tham gia'}</label>
                                <div>{selectedTraining.participants_count} {appLang === 'vi' ? 'người' : 'people'}</div>
                            </div>

                            {/* Section 2: Trainee Info */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.farmer}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_name}</label>
                                <div style={{ fontWeight: 600 }}>{selectedTraining.expand?.farmer_id?.full_name}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_code}</label>
                                <div style={{ fontFamily: 'monospace' }}>{selectedTraining.expand?.farmer_id?.farmer_code}</div>
                            </div>

                            {/* Section 3: Result */}
                            <div className="detail-section" style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <h4 style={{ fontSize: '14px', color: 'var(--coffee-dark)', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>{t.act_detail}</h4>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.application_level}</label>
                                <div>{getApplicationLevelBadge(selectedTraining.application_level)}</div>
                            </div>

                            {selectedTraining.feedback && (
                                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{appLang === 'vi' ? 'Phản hồi' : 'Feedback'}</label>
                                    <div style={{ fontStyle: 'italic', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>"{selectedTraining.feedback}"</div>
                                </div>
                            )}

                            {selectedTraining.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.notes}</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedTraining.notes}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {canEdit() && (
                                    <>
                                        <button onClick={() => { setShowDetailModal(false); handleEdit(selectedTraining); }} style={{
                                            background: '#fef3c7', border: '1px solid #d97706',
                                            color: '#92400e', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                                        }}>
                                            <i className="fas fa-pen"></i> {t.edit}
                                        </button>
                                        <button onClick={() => { setShowDetailModal(false); handleDelete(selectedTraining.id); }} style={{
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

export default TrainingCenter;
