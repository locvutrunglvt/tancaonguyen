/* DASHBOARD & HOME MENU - TCN - REFACTORED FOR STABILITY */
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';
import { translations } from './translations';
import ModelManagement from './ModelManagement';
import FarmerManagement from './FarmerManagement';
import AnnualActivities from './AnnualActivities';
import TrainingCenter from './TrainingCenter';
import FarmProfiles from './FarmProfiles';
import SeasonalPlanning from './SeasonalPlanning';

// Components Moved Outside for React Component Stability (Fixes Input Focus Bug)
const HomeView = ({ menuItems, t }) => (
    <div className="home-container">
        <div className="menu-grid">
            {menuItems.map(item => (
                <div key={item.id} className="menu-card" onClick={item.action || (() => alert(t.feature_coming_soon || 'Feature coming soon'))}>
                    <div className="menu-icon">
                        <i className={item.icon}></i>
                    </div>
                    <div className="card-info">
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                    </div>
                </div>
            ))}
        </div>
        <footer className="dashboard-footer-branding">
            {t.footer_copyright || 'Bản quyền và phát triển bởi Tân Cao Nguyên, 2026'}
        </footer>
    </div>
);

const PasswordModal = ({ t, onClose, onSave, isLoading }) => {
    const [pw, setPw] = useState({ new: '', confirm: '' });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (pw.new !== pw.confirm) return alert(t.password_mismatch);
        onSave(pw.new);
    };
    return (
        <div className="modal-overlay">
            <div className="modal-content animate-in" style={{ maxWidth: '400px' }}>
                <header className="modal-header">
                    <h3><i className="fas fa-key"></i> {t.change_password}</h3>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </header>
                <form onSubmit={handleSubmit} className="form-container">
                    <div className="form-group">
                        <label>{t.new_password}</label>
                        <input className="input-pro" type="password" required value={pw.new} onChange={e => setPw({ ...pw, new: e.target.value })} minLength="6" />
                    </div>
                    <div className="form-group">
                        <label>{t.confirm_password}</label>
                        <input className="input-pro" type="password" required value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} minLength="6" />
                    </div>
                    <div className="modal-actions" style={{ marginTop: '20px' }}>
                        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? t.loading : t.update}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagementView = ({
    users, t, currentUser, onBack, onAdd, onEdit, onDelete,
    showModal, onModalClose, userForm, onFormChange, onSave, isEditing, isLoading
}) => {
    // Permission Logic: Only Admin of the same org OR TCN Admin can Manage
    const canManageUser = (targetOrg) => {
        if (!currentUser) return false;
        const isAdmin = currentUser.role === 'Admin';
        const isTCNAdmin = currentUser.organization === 'tcn' && isAdmin;
        const isSameOrg = currentUser.organization === targetOrg;
        // Exception: Grand admin can manage all
        const isSuperAdmin = currentUser.email?.includes('admin@daklack.com');
        return isAdmin && (isSameOrg || isTCNAdmin || isSuperAdmin);
    };

    const perms = { view: true, add: true, edit: true, delete: true }; // Form permissions helper

    return (
        <div className="view-container">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                {currentUser?.role === 'Admin' && (
                    <button
                        onClick={onAdd}
                        className="btn-add-user"
                        style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--tcn-dark)', color: 'white', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <i className="fas fa-user-plus"></i> {(t.user_add_btn || 'THÊM NGƯỜI DÙNG').toUpperCase()}
                    </button>
                )}
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3><i className="fas fa-users-cog" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.user_list_title}</h3>
                    <div className="badge">{users.length} {t.users?.toLowerCase()}</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>{t.user_name}</th>
                            <th>{t.user_email}</th>
                            <th>{t.user_org}</th>
                            <th>{t.user_role}</th>
                            <th>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>{t.loading}</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.5 }}>{t.no_data}</td></tr>
                        ) : (
                            users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{u.employee_code || '---'}</div>
                                    </td>
                                    <td>{u.email}</td>
                                    <td><span className="badge-org">{u.organization?.toUpperCase()}</span></td>
                                    <td>
                                        <span className={`role-badge role-${u.role?.toLowerCase()}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {canManageUser(u.organization) && (
                                                <>
                                                    <button onClick={() => onEdit(u)} style={{
                                                        background: '#fef3c7', border: '1px solid #d97706',
                                                        color: '#92400e', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }} title={t.edit}>
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    <button onClick={() => onDelete(u.id)} style={{
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
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginBottom: '20px', color: 'var(--coffee-dark)', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            {isEditing ? (t.update + ' ' + t.users?.toLowerCase()) : t.user_add_btn}
                        </h3>
                        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group">
                                <label>{t.user_name}</label>
                                <input className="input-pro" value={userForm.full_name} onChange={e => onFormChange({ ...userForm, full_name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>{t.user_email}</label>
                                <input className="input-pro" type="email" value={userForm.email} onChange={e => onFormChange({ ...userForm, email: e.target.value })} disabled={isEditing} required />
                            </div>
                            <div className="form-group">
                                <label>{t.user_phone}</label>
                                <input className="input-pro" value={userForm.phone} onChange={e => onFormChange({ ...userForm, phone: e.target.value })} placeholder="09xx xxx xxx" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>{t.user_org}</label>
                                    <select
                                        className="input-pro"
                                        value={userForm.organization}
                                        onChange={e => onFormChange({ ...userForm, organization: e.target.value })}
                                        disabled={currentUser?.organization !== 'tcn' && !currentUser?.email?.includes('admin@daklack.com')}
                                    >
                                        <option value="tcn">Tân Cao Nguyên (TCN)</option>
                                        <option value="tch">Tchibo (TCH)</option>
                                        <option value="nkg">NKG (NKG)</option>
                                        <option value="far">Nông hộ (FAR)</option>
                                        <option value="gus">Khách (GUS)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    {!isEditing ? (
                                        <>
                                            <label>{t.password}</label>
                                            <input className="input-pro" type="password" value={userForm.password || ''} onChange={e => onFormChange({ ...userForm, password: e.target.value })} required minLength="6" />
                                        </>
                                    ) : (
                                        <>
                                            <label>{t.user_role}</label>
                                            <select className="input-pro" value={userForm.role} onChange={e => onFormChange({ ...userForm, role: e.target.value })}>
                                                <option value="Guest">Guest</option>
                                                <option value="Viewer">Viewer</option>
                                                <option value="Farmer">Farmer</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </>
                                    )}
                                </div>
                            </div>
                            {!isEditing ? (
                                <div className="form-group">
                                    <label>{t.user_role}</label>
                                    <select className="input-pro" value={userForm.role} onChange={e => onFormChange({ ...userForm, role: e.target.value })}>
                                        <option value="Guest">Guest</option>
                                        <option value="Viewer">Viewer</option>
                                        <option value="Farmer">Farmer</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            ) : null}

                            <div className="permissions-section" style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--coffee-dark)', marginBottom: '8px', display: 'block' }}>
                                    <i className="fas fa-shield-alt"></i> {t.user_perm_title}
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.view} readOnly /> {t.user_perm_view}
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.add} readOnly /> {t.user_perm_add}
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.edit} readOnly /> {t.user_perm_edit}
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.delete} readOnly /> {t.user_perm_delete}
                                    </label>
                                </div>
                                <p style={{ fontSize: '10px', marginTop: '10px', color: '#64748b', fontStyle: 'italic' }}>* {t.user_perm_note || 'Permissions are automatically adjusted by Role'}</p>
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isLoading}>
                                    {isLoading ? t.loading : (isEditing ? t.update : t.add)}
                                </button>
                                <button type="button" onClick={onModalClose} className="btn-primary" style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>
                                    {t.cancel}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const UserProfileModal = ({ user, t, onClose, onPasswordClick }) => {
    if (!user) return null;
    return (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
            <div className="modal-content animate-in" style={{ maxWidth: '450px', borderRadius: '32px', overflow: 'hidden', padding: '0' }}>
                <header style={{
                    background: 'linear-gradient(135deg, var(--coffee-dark), var(--coffee-primary))',
                    padding: '40px 20px', textAlign: 'center', color: 'white', position: 'relative'
                }}>
                    <button className="btn-close" onClick={onClose} style={{ color: 'white', opacity: 0.8, position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                    <div style={{ fontSize: '64px', marginBottom: '15px' }}>
                        <i className="fas fa-user-shield"></i>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0' }}>{user.full_name || 'User Profile'}</h2>
                    <span style={{
                        display: 'inline-block', marginTop: '10px', padding: '4px 16px',
                        background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '12px', fontWeight: 700
                    }}>{user.role?.toUpperCase()}</span>
                </header>

                <div className="profile-details" style={{ padding: '30px' }}>
                    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, auto) 1fr', gap: '20px', fontSize: '14px', marginBottom: '30px' }}>
                        <div style={{ fontWeight: 700, color: '#64748b' }}><i className="fas fa-envelope" style={{ width: '20px' }}></i> {t.user_email}:</div>
                        <div style={{ fontWeight: 600, color: 'var(--coffee-dark)' }}>{user.email}</div>
                        <div style={{ fontWeight: 700, color: '#64748b' }}><i className="fas fa-sitemap" style={{ width: '20px' }}></i> {t.user_org}:</div>
                        <div style={{ fontWeight: 600, color: 'var(--coffee-dark)' }}>{user.organization?.toUpperCase()}</div>
                        <div style={{ fontWeight: 700, color: '#64748b' }}><i className="fas fa-id-badge" style={{ width: '20px' }}></i> {t.user_code}:</div>
                        <div style={{ fontWeight: 600, color: 'var(--coffee-dark)' }}>{user.employee_code || '---'}</div>
                        <div style={{ fontWeight: 700, color: '#64748b' }}><i className="fas fa-phone" style={{ width: '20px' }}></i> {t.user_phone}:</div>
                        <div style={{ fontWeight: 600, color: 'var(--coffee-dark)' }}>{user.phone || '---'}</div>
                    </div>

                    <button onClick={onPasswordClick} className="btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '16px', background: 'var(--coffee-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                        <i className="fas fa-key"></i> {t.change_password}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '20px' }}>
                        {appLang === 'vi' ? 'Cập nhật thông tin chi tiết qua Quản trị viên hệ thống.' : appLang === 'en' ? 'Update details via System Administrator.' : 'Klei hơ mơ mdrâng hŏ qua Khua mdrông.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---

const Dashboard = ({ devUser, onLogout }) => {
    const [view, setView] = useState('home');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(devUser || null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({ id: '', email: '', full_name: '', organization: 'gus', role: 'Guest', employee_code: '', phone: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [showPwModal, setShowPwModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [appLang, setAppLang] = useState(localStorage.getItem('app_lang') || 'vi');
    const t = translations[appLang];

    useEffect(() => {
        const load = async () => {
            if (devUser) {
                setCurrentUser(devUser);
            } else {
                await fetchUserProfile();
            }
        };
        load();
    }, [devUser]);


    useEffect(() => {
        if (view === 'users') fetchUsersList();
    }, [view]);

    const fetchUserProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setCurrentUser(profile || user);
        }
    };

    const handleChangePassword = async (newPassword) => {
        if (devUser) {
            alert("DEV_MODE: Password change simulated successfully!");
            setShowPwModal(false);
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error(t.login_required || "Please login again.");

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            alert(t.password_success);
            setShowPwModal(false);
        } catch (error) {
            alert(`ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsersList = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, organization, role, employee_code, phone')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            alert(`FETCH_ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateEmployeeCode = (org, existingUsers) => {
        const prefix = org.toUpperCase();
        const orgUsers = existingUsers.filter(u => u.organization === org);

        let maxNum = 0;
        orgUsers.forEach(u => {
            if (u.employee_code && u.employee_code.startsWith(prefix + '-')) {
                const parts = u.employee_code.split('-');
                if (parts.length > 1) {
                    const numPart = parseInt(parts[1]);
                    if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
                }
            }
        });

        const nextNum = (maxNum + 1).toString().padStart(4, '0'); // 4 digits as requested
        return `${prefix}-${nextNum}`;
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Business Logic: Generate structured code if missing or or organization changed
            let finalCode = userForm.employee_code;
            if (!finalCode) {
                finalCode = handleGenerateEmployeeCode(userForm.organization, users);
            }

            if (isEditing) {
                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userForm.id,
                        email: userForm.email,
                        full_name: userForm.full_name,
                        organization: userForm.organization,
                        role: userForm.role,
                        employee_code: finalCode,
                        phone: userForm.phone
                    });
                if (error) throw error;
            } else {
                // Perform account registration in Supabase Auth
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: userForm.email,
                    password: userForm.password || '12345678', // Default if not provided
                    options: {
                        data: {
                            full_name: userForm.full_name,
                            organization: userForm.organization,
                            role: userForm.role,
                            employee_code: finalCode,
                            phone: userForm.phone
                        }
                    }
                });

                if (signUpError) throw signUpError;

                // Manual insert into 'profiles' as fallback
                if (data?.user) {
                    const { error: profError } = await supabase
                        .from('profiles')
                        .insert([{
                            id: data.user.id,
                            email: userForm.email,
                            full_name: userForm.full_name,
                            organization: userForm.organization,
                            role: userForm.role,
                            employee_code: finalCode,
                            phone: userForm.phone
                        }]);
                    if (profError) {
                        console.error("METADATA_SYNC_FAIL: ", profError.message);
                    }
                }
            }
            alert(t.save_success);
            setShowUserModal(false);
            fetchUsersList();
        } catch (error) {
            alert(`SAVE_ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm(t.delete_confirm)) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            alert(t.delete_success);
            fetchUsersList();
        } catch (error) {
            alert(`DELETE_ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (onLogout) await onLogout();
        else await supabase.auth.signOut();
    };

    const menuItems = [
        { id: 'farmers', title: t.farmers, desc: t.farmers_desc, icon: 'fas fa-id-card', action: () => setView('farmers') },
        { id: 'farms', title: t.farms, desc: t.farms_desc, icon: 'fas fa-map-marked-alt', action: () => setView('farms') },
        { id: 'activities', title: t.activities, desc: t.activities_desc, icon: 'fas fa-calendar-check', action: () => setView('activities') },
        { id: 'planning', title: t.planning, desc: t.planning_desc, icon: 'fas fa-clipboard-list', action: () => setView('planning') },
        { id: 'training', title: t.training, desc: t.training_desc, icon: 'fas fa-graduation-cap', action: () => setView('training') },
        { id: 'model', title: t.model, desc: t.model_desc, icon: 'fas fa-seedling', action: () => setView('model') },
        { id: 'growth', title: t.growth || 'Tăng trưởng', desc: t.growth_desc || 'Theo dõi sự tăng trưởng và phát triển của mô hình.', icon: 'fas fa-chart-line', action: () => setView('growth') },
    ];

    // Security check: Is current user an Admin?
    const isAdmin = currentUser?.role === 'Admin' || currentUser?.email?.includes('admin@daklack.com');

    if (isAdmin) {
        menuItems.push({ id: 'users', title: 'Admin', desc: t.users_desc || 'Quản trị hệ thống và người dùng.', icon: 'fas fa-users-cog', action: () => setView('users') });
    }

    return (
        <div className={`dashboard-layout lang-${appLang}`}>
            <aside className="sidebar">
                <nav className="nav-menu">
                    <a className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                        <i className="fas fa-home"></i> <span>{t.home}</span>
                    </a>
                    <a className={`nav-item ${view === 'growth' ? 'active' : ''}`} onClick={() => setView('growth')}>
                        <i className="fas fa-chart-line"></i> <span>{t.growth || 'Tăng trưởng'}</span>
                    </a>
                    <a className={`nav-item ${view === 'farmers' ? 'active' : ''}`} onClick={() => setView('farmers')}>
                        <i className="fas fa-id-card"></i> <span>{t.farmers}</span>
                    </a>
                    <a className={`nav-item ${view === 'farms' ? 'active' : ''}`} onClick={() => setView('farms')}>
                        <i className="fas fa-map-marked-alt"></i> <span>{t.farms}</span>
                    </a>
                    <a className={`nav-item ${view === 'activities' ? 'active' : ''}`} onClick={() => setView('activities')}>
                        <i className="fas fa-calendar-check"></i> <span>{t.activities}</span>
                    </a>
                    <a className={`nav-item ${view === 'planning' ? 'active' : ''}`} onClick={() => setView('planning')}>
                        <i className="fas fa-clipboard-list"></i> <span>{t.planning}</span>
                    </a>
                    <a className={`nav-item ${view === 'training' ? 'active' : ''}`} onClick={() => setView('training')}>
                        <i className="fas fa-graduation-cap"></i> <span>{t.training}</span>
                    </a>
                    <a className={`nav-item ${view === 'model' ? 'active' : ''}`} onClick={() => setView('model')}>
                        <i className="fas fa-seedling"></i> <span>{t.model}</span>
                    </a>
                    {isAdmin && (
                        <a className={`nav-item ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>
                            <i className="fas fa-users-cog"></i> <span>Admin</span>
                        </a>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <div onClick={() => setShowProfileModal(true)} className="user-working-section" style={{
                        marginBottom: '15px', padding: '12px', background: 'var(--coffee-light)',
                        borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--coffee-medium)'
                    }}>
                        <div style={{ fontSize: '10px', color: 'var(--coffee-dark)', fontWeight: 700, opacity: 0.7 }}>{t.working_user}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--coffee-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <i className="fas fa-user-circle"></i> {currentUser?.full_name || currentUser?.email?.split('@')[0] || t.admin}
                        </div>
                    </div>
                    <div onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i> <span>{t.logout}</span>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="header-stack always-centered">
                    <div className="header-row header-logo-row">
                        <img src="https://github.com/locvutrunglvt/Tancaonguyen/blob/main/Logo.png?raw=true" alt="Partner Logos" className="header-logo-unified" />
                    </div>

                    <div className="header-row header-title-row">
                        <h1 className="header-project-title">
                            {t.app_title_1}<br />
                            {t.app_title_2}
                        </h1>
                    </div>

                    <div className="header-row header-controls-row">
                        <div className="header-controls-group">
                            <div className="in-app-lang">
                                <button className={`lang-mini-btn ${appLang === 'vi' ? 'active' : ''}`} onClick={() => { setAppLang('vi'); localStorage.setItem('app_lang', 'vi'); }}><img src="https://flagcdn.com/w20/vn.png" alt="VI" /></button>
                                <button className={`lang-mini-btn ${appLang === 'en' ? 'active' : ''}`} onClick={() => { setAppLang('en'); localStorage.setItem('app_lang', 'en'); }}><img src="https://flagcdn.com/w20/gb.png" alt="EN" /></button>
                                <button className={`lang-mini-btn ${appLang === 'ede' ? 'active' : ''}`} onClick={() => { setAppLang('ede'); localStorage.setItem('app_lang', 'ede'); }} style={{ border: 'none', background: appLang === 'ede' ? 'var(--coffee-dark)' : 'none', color: appLang === 'ede' ? 'white' : 'var(--coffee-dark)', cursor: 'pointer', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold' }}>EĐ</button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="view-scroll-container">
                    {view === 'home' && <HomeView menuItems={menuItems} t={t} />}
                    {view === 'growth' && (
                        <div className="view-container" style={{ textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '24px' }}>
                            <div style={{ fontSize: '64px', color: 'var(--coffee-primary)', marginBottom: '20px' }}><i className="fas fa-chart-line"></i></div>
                            <h2 style={{ fontSize: '24px', color: 'var(--coffee-dark)', textTransform: 'uppercase' }}>{t.growth || 'TĂNG TRƯỞNG & PHÁT TRIỂN'}</h2>
                            <p style={{ color: '#64748b', marginTop: '10px' }}>{t.sync_data_msg || 'Chức năng đang được đồng bộ dữ liệu thực địa. Vui lòng quay lại sau.'}</p>
                            <button onClick={() => setView('home')} className="btn-primary" style={{ marginTop: '30px', width: 'auto', padding: '12px 40px' }}>{t.back}</button>
                        </div>
                    )}
                    {view === 'users' && (
                        <UserManagementView
                            users={users} t={t} currentUser={currentUser}
                            onBack={() => setView('home')}
                            onAdd={() => { setUserForm({ id: '', email: '', full_name: '', organization: currentUser?.organization || 'gus', role: 'Guest', employee_code: '', phone: '' }); setIsEditing(false); setShowUserModal(true); }}
                            onEdit={(u) => { setUserForm(u); setIsEditing(true); setShowUserModal(true); }}
                            onDelete={handleDeleteUser}
                            showModal={showUserModal}
                            onModalClose={() => setShowUserModal(false)}
                            userForm={userForm}
                            onFormChange={setUserForm}
                            onSave={handleSaveUser}
                            isEditing={isEditing}
                            isLoading={loading}
                        />
                    )}
                    {view === 'model' && <ModelManagement onBack={() => setView('home')} devUser={devUser} appLang={appLang} currentUser={currentUser} />}
                    {view === 'activities' && <AnnualActivities onBack={() => setView('home')} devUser={devUser} appLang={appLang} currentUser={currentUser} />}
                    {view === 'training' && <TrainingCenter onBack={() => setView('home')} devUser={devUser} appLang={appLang} currentUser={currentUser} />}
                    {view === 'farms' && <FarmProfiles onBack={() => setView('home')} devUser={devUser} appLang={appLang} currentUser={currentUser} />}
                    {view === 'planning' && <SeasonalPlanning onBack={() => setView('home')} devUser={devUser} appLang={appLang} currentUser={currentUser} />}
                    {view === 'farmers' && <FarmerManagement onBack={() => setView('home')} devUser={devUser} appLang={appLang} currentUser={currentUser} />}
                </div>
            </main>

            {showProfileModal && <UserProfileModal user={currentUser} t={t} onClose={() => setShowProfileModal(false)} onPasswordClick={() => { setShowProfileModal(false); setShowPwModal(true); }} />}
            {showPwModal && <PasswordModal t={t} onClose={() => setShowPwModal(false)} onSave={handleChangePassword} isLoading={loading} />}

            <nav className="mobile-bottom-nav">
                <button className={`nav-item-mobile ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                    <i className="fas fa-home"></i> <span>{t.home}</span>
                </button>
            </nav>
        </div>
    );
};

export default Dashboard;
