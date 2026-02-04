import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';
import { translations } from './translations';
import MediaUpload from './MediaUpload';

const FarmerManagement = ({ onBack, devUser, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Detail View State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedFarmer, setSelectedFarmer] = useState(null);

    // Form state - using new farmers table fields
    const [formData, setFormData] = useState({
        farmer_code: '',
        full_name: '',
        gender: 'Nam',
        date_of_birth: '',
        id_card: '',
        phone: '',
        email: '',
        village: '',
        commune: '',
        district: '',
        province: 'Đắk Lắk',
        household_members: 1,
        household_head: true,
        status: 'active',
        notes: '',
        photo_url: ''
    });

    useEffect(() => {
        fetchFarmers();
    }, []);

    const fetchFarmers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('farmers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFarmers(data || []);
        } catch (e) {
            console.error('Error fetching farmers:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const generateFarmerCode = async () => {
        // Get the latest farmer code
        const { data } = await supabase
            .from('farmers')
            .select('farmer_code')
            .order('created_at', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            const lastCode = data[0].farmer_code;
            const match = lastCode.match(/FAR-(\d+)/);
            if (match) {
                const nextNum = parseInt(match[1]) + 1;
                return `FAR-${String(nextNum).padStart(4, '0')}`;
            }
        }
        return 'FAR-0001';
    };

    const handleEdit = (farmer) => {
        setFormData({
            farmer_code: farmer.farmer_code || '',
            full_name: farmer.full_name || '',
            gender: farmer.gender || 'Nam',
            date_of_birth: farmer.date_of_birth || '',
            id_card: farmer.id_card || '',
            phone: farmer.phone || '',
            email: farmer.email || '',
            village: farmer.village || '',
            commune: farmer.commune || '',
            district: farmer.district || '',
            province: farmer.province || 'Đắk Lắk',
            household_members: farmer.household_members || 1,
            household_head: farmer.household_head !== undefined ? farmer.household_head : true,
            status: farmer.status || 'active',
            notes: farmer.notes || '',
            photo_url: farmer.photo_url || ''
        });
        setEditingId(farmer.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm(t.delete_confirm)) return;
        setLoading(true);
        const { error } = await supabase.from('farmers').delete().eq('id', id);
        if (error) {
            alert((t.save_error || 'Lỗi: ') + error.message);
        } else {
            alert(t.delete_success);
            fetchFarmers();
        }
        setLoading(false);
    };

    const handleView = (farmer) => {
        setSelectedFarmer(farmer);
        setShowDetailModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditing) {
                // Update existing farmer
                const { error } = await supabase
                    .from('farmers')
                    .update({
                        full_name: formData.full_name,
                        gender: formData.gender,
                        date_of_birth: formData.date_of_birth || null,
                        id_card: formData.id_card,
                        phone: formData.phone,
                        email: formData.email,
                        village: formData.village,
                        commune: formData.commune,
                        district: formData.district,
                        province: formData.province,
                        household_members: parseInt(formData.household_members) || 1,
                        household_head: formData.household_head,
                        status: formData.status,
                        notes: formData.notes,
                        photo_url: formData.photo_url
                    })
                    .eq('id', editingId);

                if (error) throw error;
                alert(t.save_success);
            } else {
                // Create new farmer
                const newCode = await generateFarmerCode();
                const { error } = await supabase.from('farmers').insert([{
                    farmer_code: newCode,
                    full_name: formData.full_name,
                    gender: formData.gender,
                    date_of_birth: formData.date_of_birth || null,
                    id_card: formData.id_card,
                    phone: formData.phone,
                    email: formData.email,
                    village: formData.village,
                    commune: formData.commune,
                    district: formData.district,
                    province: formData.province,
                    household_members: parseInt(formData.household_members) || 1,
                    household_head: formData.household_head,
                    status: formData.status,
                    notes: formData.notes,
                    photo_url: formData.photo_url
                }]);

                if (error) throw error;
                alert(t.save_success);
            }
            handleModalClose();
            fetchFarmers();
        } catch (error) {
            alert((t.save_error || 'Lỗi: ') + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            farmer_code: '',
            full_name: '',
            gender: 'Nam',
            date_of_birth: '',
            id_card: '',
            phone: '',
            email: '',
            village: '',
            commune: '',
            district: '',
            province: 'Đắk Lắk',
            household_members: 1,
            household_head: true,
            status: 'active',
            notes: '',
            photo_url: ''
        });
    };

    const canEdit = () => {
        if (!currentUser) return false;
        return currentUser.role === 'Admin';
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: { bg: '#dcfce7', color: '#166534', text: t.status_active },
            inactive: { bg: '#f3f4f6', color: '#6b7280', text: t.status_inactive },
            suspended: { bg: '#fee2e2', color: '#991b1b', text: t.status_suspended }
        };
        const style = styles[status] || styles.active;
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
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setShowModal(true);
                    }}
                    className="btn-add-user"
                >
                    <i className="fas fa-user-plus"></i> {t.add} {t.farmers}
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3><i className="fas fa-users" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.farmer_list_title}</h3>
                    <div className="badge">{farmers.length} {t.farmers?.toLowerCase()}</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>{t.farmer_code}</th>
                            <th>{t.farmer_name}</th>
                            <th>{t.farmer_village}</th>
                            <th>{t.farmer_phone}</th>
                            <th>{t.household_members}</th>
                            <th>{t.status}</th>
                            <th>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && farmers.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                        ) : farmers.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data}</td></tr>
                        ) : (
                            farmers.map(f => (
                                <tr key={f.id} onClick={() => handleView(f)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--coffee-primary)' }}>{f.farmer_code}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {f.photo_url ? (
                                                <img src={f.photo_url} alt="Ava" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <i className="fas fa-user" style={{ fontSize: '14px', color: '#94a3b8' }}></i>
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{f.full_name}</div>
                                                <div style={{ fontSize: '10px', opacity: 0.6 }}>{f.gender === 'Nam' ? t.gender_male : f.gender === 'Nữ' ? t.gender_female : t.gender_other}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{f.village || 'N/A'}</td>
                                    <td>{f.phone}</td>
                                    <td style={{ textAlign: 'center' }}>{f.household_members || 1}</td>
                                    <td>{getStatusBadge(f.status)}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {/* VIEW BUTTON (Always visible) */}
                                            <button onClick={() => handleView(f)} style={{
                                                background: '#e0f2fe', border: '1px solid #7dd3fc',
                                                color: '#0369a1', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }} title={t.details}>
                                                <i className="fas fa-eye"></i>
                                            </button>

                                            {/* EDIT/DELETE (Admin Only) */}
                                            {canEdit() && (
                                                <>
                                                    <button onClick={() => handleEdit(f)} style={{
                                                        background: '#fef3c7', border: '1px solid #d97706',
                                                        color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }} title={t.edit}>
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(f.id)} style={{
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

            {showModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '25px', color: 'var(--tcn-dark)' }}>
                            {isEditing ? (t.update + ' ' + t.farmers?.toLowerCase()) : t.farmer_add_title}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Column 1 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <h4 style={{ color: 'var(--coffee-dark)', fontSize: '14px', marginBottom: '-5px' }}>{t.general_info}</h4>

                                    <div className="form-group">
                                        <label>{t.farmer_name} *</label>
                                        <input className="input-pro" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder={t.search_placeholder} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label>{t.farmer_gender}</label>
                                            <select className="input-pro" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                                <option value="Nam">{t.gender_male}</option>
                                                <option value="Nữ">{t.gender_female}</option>
                                                <option value="Khác">{t.gender_other}</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t.farmer_dob}</label>
                                            <input className="input-pro" type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>{t.farmer_id_card}</label>
                                        <input className="input-pro" value={formData.id_card} onChange={e => setFormData({ ...formData, id_card: e.target.value })} placeholder="001234567890" />
                                    </div>

                                    <div className="form-group">
                                        <label>{t.farmer_phone} *</label>
                                        <input className="input-pro" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="09xx xxx xxx" />
                                    </div>

                                    <div className="form-group">
                                        <label>{t.farmer_email}</label>
                                        <input className="input-pro" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                                    </div>
                                </div>

                                {/* Column 2 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <h4 style={{ color: 'var(--coffee-dark)', fontSize: '14px', marginBottom: '-5px' }}>{t.farmer_address}</h4>

                                    <div className="form-group">
                                        <label>{t.farmer_village} *</label>
                                        <input className="input-pro" required value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} placeholder="Buôn Ea Kmát" />
                                    </div>

                                    <div className="form-group">
                                        <label>{t.farmer_commune}</label>
                                        <input className="input-pro" value={formData.commune} onChange={e => setFormData({ ...formData, commune: e.target.value })} placeholder="Ea Kmát" />
                                    </div>

                                    <div className="form-group">
                                        <label>{t.farmer_district}</label>
                                        <input className="input-pro" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} placeholder="Ea Kar" />
                                    </div>

                                    <div className="form-group">
                                        <label>{t.farmer_province}</label>
                                        <input className="input-pro" value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group">
                                            <label>{t.household_members}</label>
                                            <input className="input-pro" type="number" min="1" value={formData.household_members} onChange={e => setFormData({ ...formData, household_members: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t.status}</label>
                                            <select className="input-pro" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                                <option value="active">{t.status_active}</option>
                                                <option value="inactive">{t.status_inactive}</option>
                                                <option value="suspended">{t.status_suspended}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={formData.household_head} onChange={e => setFormData({ ...formData, household_head: e.target.checked })} />
                                            {t.household_head}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>{t.notes}</label>
                                <textarea className="input-pro" rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder={t.notes + '...'}></textarea>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>{appLang === 'vi' ? 'Ảnh nông hộ' : appLang === 'en' ? 'Farmer Photo' : 'Ảnh mnuih'}</label>
                                <MediaUpload
                                    entityType="farmers"
                                    entityId={isEditing ? editingId : 'new'}
                                    currentUrl={formData.photo_url}
                                    onUploadSuccess={(url) => setFormData({ ...formData, photo_url: url })}
                                    appLang={appLang}
                                />
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    <i className="fas fa-save"></i> {loading ? t.loading : (isEditing ? t.update.toUpperCase() : t.save.toUpperCase())}
                                </button>
                                <button type="button" className="btn-primary" style={{ background: '#f1f5f9', color: '#475569' }} onClick={handleModalClose}>
                                    <i className="fas fa-undo"></i> {t.cancel.toUpperCase()}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {showDetailModal && selectedFarmer && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--tcn-dark)', fontSize: '18px' }}>
                                <i className="fas fa-id-card" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                                {t.user_info}
                            </h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>&times;</button>
                        </div>

                        {selectedFarmer.photo_url && (
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <img src={selectedFarmer.photo_url} alt="Farmer" style={{ width: '150px', height: '150px', borderRadius: '20px', objectFit: 'cover', border: '4px solid #f8fafc', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_code}</label>
                                <div style={{ fontWeight: 'bold', color: 'var(--coffee-primary)' }}>{selectedFarmer.farmer_code}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.status}</label>
                                <div>{getStatusBadge(selectedFarmer.status)}</div>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_name}</label>
                                <div style={{ fontWeight: 600 }}>{selectedFarmer.full_name}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_gender}</label>
                                <div>{selectedFarmer.gender === 'Nam' ? t.gender_male : selectedFarmer.gender === 'Nữ' ? t.gender_female : t.gender_other}</div>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_dob}</label>
                                <div>{selectedFarmer.date_of_birth ? new Date(selectedFarmer.date_of_birth).toLocaleDateString(appLang === 'en' ? 'en-US' : 'vi-VN') : '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_id_card}</label>
                                <div>{selectedFarmer.id_card || '---'}</div>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_phone}</label>
                                <div>{selectedFarmer.phone || '---'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_email}</label>
                                <div>{selectedFarmer.email || '---'}</div>
                            </div>

                            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.farmer_address}</label>
                                <div>
                                    {selectedFarmer.village}, {selectedFarmer.commune ? `${selectedFarmer.commune}, ` : ''}{selectedFarmer.district ? `${selectedFarmer.district}, ` : ''}{selectedFarmer.province}
                                </div>
                            </div>

                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.household_members}</label>
                                <div>{selectedFarmer.household_members} {appLang === 'vi' ? 'người' : appLang === 'en' ? 'members' : 'mnuih'}</div>
                            </div>
                            <div className="detail-item">
                                <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.household_head}</label>
                                <div>{selectedFarmer.household_head ? t.household_head : (appLang === 'vi' ? 'Thành viên' : appLang === 'en' ? 'Member' : 'Mnuih')}</div>
                            </div>

                            {selectedFarmer.notes && (
                                <div className="detail-item" style={{ gridColumn: 'span 2', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{t.notes}</label>
                                    <div style={{ fontStyle: 'italic' }}>{selectedFarmer.notes}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {canEdit() && (
                                    <>
                                        <button onClick={() => { setShowDetailModal(false); handleEdit(selectedFarmer); }} style={{
                                            background: '#fef3c7', border: '1px solid #d97706',
                                            color: '#92400e', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                                        }}>
                                            <i className="fas fa-pen"></i> {t.edit}
                                        </button>
                                        <button onClick={() => { setShowDetailModal(false); handleDelete(selectedFarmer.id); }} style={{
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

export default FarmerManagement;
