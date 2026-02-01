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
        <div className="home-menu-grid">
            {menuItems.map(item => (
                <div key={item.id} className="menu-card" onClick={item.action || (() => alert('Feature coming soon'))}>
                    <div className="card-icon" style={{ background: 'var(--coffee-medium)', color: 'white' }}>
                        <i className={item.icon}></i>
                    </div>
                    <div className="card-info">
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const UserManagementView = ({
    users, t, onBack, onAdd, onEdit, onDelete,
    showModal, onModalClose, userForm, onFormChange, onSave, isEditing, isLoading
}) => {
    // Local calculation for permissions display
    const getPermissions = (role) => {
        if (role === 'Admin') return { view: true, add: true, edit: true, delete: true };
        if (role === 'Farmer') return { view: true, add: false, edit: true, delete: false };
        if (role === 'Viewer') return { view: true, add: false, edit: false, delete: false };
        return { view: true, add: false, edit: false, delete: false }; // Guest / Other
    };

    const perms = getPermissions(userForm.role);

    return (
        <div className="view-container">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <button
                    onClick={onAdd}
                    className="btn-add-user"
                    style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--tcn-dark)', color: 'white', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <i className="fas fa-user-plus"></i> {t.user_add_btn}
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3><i className="fas fa-users-cog" style={{ color: 'var(--coffee-medium)', marginRight: '10px' }}></i>{t.user_list_title}</h3>
                    <div className="badge">{users.length} {t.users?.toLowerCase() || 'members'}</div>
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
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{u.employee_code || 'N/A'}</div>
                                </td>
                                <td>{u.email}</td>
                                <td><span className="badge-org">{u.organization?.toUpperCase()}</span></td>
                                <td>
                                    <span className={`role-badge role-${u.role?.toLowerCase()}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => onEdit(u)} style={{ background: 'none', border: 'none', color: 'var(--coffee-medium)', cursor: 'pointer' }}>
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button onClick={() => onDelete(u.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginBottom: '20px', color: 'var(--coffee-dark)', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            {isEditing ? t.update + ' ' + t.users?.toLowerCase() : t.user_add_btn}
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>{t.user_code}</label>
                                    <input className="input-pro" value={userForm.employee_code} onChange={e => onFormChange({ ...userForm, employee_code: e.target.value })} placeholder="VD: TCN-001" />
                                </div>
                                <div className="form-group">
                                    <label>{t.user_phone}</label>
                                    <input className="input-pro" value={userForm.phone} onChange={e => onFormChange({ ...userForm, phone: e.target.value })} placeholder="09xx xxx xxx" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>{t.user_org}</label>
                                    <select className="input-pro" value={userForm.organization} onChange={e => onFormChange({ ...userForm, organization: e.target.value })}>
                                        <option value="tcn">Tân Cao Nguyên (TCN)</option>
                                        <option value="tch">Tchibo (TCH)</option>
                                        <option value="nkg">NKG (NKG)</option>
                                        <option value="far">Nông hộ (FAR)</option>
                                        <option value="gus">Khách (GUS)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t.user_role}</label>
                                    <select className="input-pro" value={userForm.role} onChange={e => onFormChange({ ...userForm, role: e.target.value })}>
                                        <option value="Guest">Khách (Guest)</option>
                                        <option value="Viewer">Viewer</option>
                                        <option value="Farmer">Farmer</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="permissions-section" style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--coffee-dark)', marginBottom: '8px', display: 'block' }}>
                                    <i className="fas fa-shield-alt"></i> {t.user_perm_title}
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.view} onChange={() => { }} /> {t.user_perm_view}
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.add} onChange={() => onFormChange({ ...userForm, role: 'Admin' })} /> {t.user_perm_add}
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.edit} onChange={() => onFormChange({ ...userForm, role: userForm.role === 'Admin' ? 'Farmer' : 'Admin' })} /> {t.user_perm_edit}
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={perms.delete} onChange={() => onFormChange({ ...userForm, role: 'Admin' })} /> {t.user_perm_delete}
                                    </label>
                                </div>
                                <p style={{ fontSize: '10px', marginTop: '10px', color: '#64748b', fontStyle: 'italic' }}>* {t.lang === 'vi' ? 'Quyền hạn được tự động điều chỉnh theo Vai trò' : 'Permissions are automatically adjusted by Role'}</p>
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

// --- Main Dashboard Component ---

const Dashboard = ({ devUser, onLogout }) => {
    const [view, setView] = useState('home');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(devUser || null);

    // Form state for adding/editing users
    const [userForm, setUserForm] = useState({ id: '', email: '', full_name: '', organization: 'gus', role: 'Guest', employee_code: '', phone: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [appLang, setAppLang] = useState(localStorage.getItem('app_lang') || 'vi');
    const t = translations[appLang];

    useEffect(() => {
        if (!devUser) checkUser();
    }, [devUser]);

    useEffect(() => {
        if (view === 'users') fetchUsersList();
    }, [view]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const fetchUsersList = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('User')
                .select('id, email, full_name, organization, role, employee_code, Phone') // Use uppercase Phone matching DB
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
        const nextNum = (orgUsers.length + 1).toString().padStart(3, '0');
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
                    .from('User')
                    .update({
                        full_name: userForm.full_name,
                        organization: userForm.organization,
                        role: userForm.role,
                        employee_code: finalCode,
                        Phone: userForm.phone, // Map UI 'phone' to DB 'Phone'
                    })
                    .eq('id', userForm.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('User').insert([{
                    ...userForm,
                    employee_code: finalCode,
                    id: crypto.randomUUID(), // Management entry mock ID
                    created_at: new Date().toISOString()
                }]);
                if (error) throw error;
            }
            setShowUserModal(false);
            fetchUsersList();
        } catch (error) {
            alert(`SAVE_ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm(t.act_confirm_delete)) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('User').delete().eq('id', id);
            if (error) throw error;
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
        { id: 'model', title: t.model, desc: t.model_desc, icon: 'fas fa-seedling', action: () => setView('model') }
    ];

    // Security check: Is current user an Admin?
    const isAdmin = currentUser?.email?.includes('admin') || true; // Force true for dev convenience, adjust in production

    return (
        <div className={`dashboard-layout lang-${appLang}`}>
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span>{t.sidebar_branding}</span>
                </div>
                <nav className="nav-menu">
                    <a className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                        <i className="fas fa-home"></i> <span>{t.home}</span>
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
                            <i className="fas fa-users-cog"></i> <span>{t.users}</span>
                        </a>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <div onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i> <span>{t.logout}</span>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div className="home-logo-bar persistent-branding">
                    <img src="https://raw.githubusercontent.com/locvutrunglvt/Tancaonguyen/refs/heads/main/tancaonguyen_old/TCN%20logo.jpg" alt="TCN" />
                    <img src="https://logos-world.net/wp-content/uploads/2023/03/Tchibo-Logo.jpg" alt="Tchibo" />
                    <img src="https://nkgvietnam.com/wp-content/uploads/2023/05/NKG-Vietnam_Logo_left-1-01.svg" alt="NKG" style={{ height: '31px' }} />
                </div>

                <h1 className="project-main-title persistent-title">{t.project_title}</h1>

                <header className="header-top">
                    <div className="dashboard-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div onClick={handleLogout} className="mobile-only-logout" style={{ cursor: 'pointer', display: 'none' }}>
                            <i className="fas fa-sign-out-alt" style={{ color: '#ef4444', fontSize: '20px' }}></i>
                        </div>
                        <div className="in-app-lang" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.7)', padding: '5px 10px', borderRadius: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                            <button className={`lang-mini-btn ${appLang === 'vi' ? 'active' : ''}`} onClick={() => setAppLang('vi')} style={{ border: 'none', background: 'none', cursor: 'pointer', outline: 'none' }}><img src="https://flagcdn.com/w20/vn.png" alt="VI" /></button>
                            <button className={`lang-mini-btn ${appLang === 'en' ? 'active' : ''}`} onClick={() => setAppLang('en')} style={{ border: 'none', background: 'none', cursor: 'pointer', outline: 'none' }}><img src="https://flagcdn.com/w20/gb.png" alt="EN" /></button>
                            <button className={`lang-mini-btn ${appLang === 'ede' ? 'active' : ''}`} onClick={() => setAppLang('ede')} style={{ border: 'none', background: appLang === 'ede' ? 'var(--coffee-dark)' : 'none', color: appLang === 'ede' ? 'white' : 'var(--coffee-dark)', cursor: 'pointer', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold' }}>EĐ</button>
                        </div>
                    </div>
                    <div className="welcome-section">
                        <p>{t.welcome}</p>
                        <h2>{currentUser?.email?.split('@')[0] || t.admin}</h2>
                    </div>
                </header>

                {view === 'home' && <HomeView menuItems={menuItems} t={t} />}
                {view === 'users' && (
                    <UserManagementView
                        users={users} t={t}
                        onBack={() => setView('home')}
                        onAdd={() => { setUserForm({ id: '', email: '', full_name: '', organization: 'gus', role: 'Guest', employee_code: '', phone: '' }); setIsEditing(false); setShowUserModal(true); }}
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
                {view === 'model' && <ModelManagement onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'activities' && <AnnualActivities onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'training' && <TrainingCenter onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'farms' && <FarmProfiles onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'planning' && <SeasonalPlanning onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'farmers' && <FarmerManagement onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
            </main>

            <nav className="mobile-bottom-nav">
                <button className={`nav-item-mobile ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                    <i className="fas fa-home"></i> <span>HOME</span>
                </button>
                <button className={`nav-item-mobile ${view === 'activities' ? 'active' : ''}`} onClick={() => setView('activities')}>
                    <i className="fas fa-calendar-alt"></i> <span>TĂNG TRƯỞNG</span>
                </button>
                {isAdmin && (
                    <button className={`nav-item-mobile ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>
                        <i className="fas fa-user-cog"></i> <span>ADMIN</span>
                    </button>
                )}
            </nav>
        </div>
    );
};

export default Dashboard;
