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

const Dashboard = ({ devUser, onLogout }) => {
    const [view, setView] = useState('home'); // 'home', 'users', 'model', 'farmers'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(devUser || null);

    // Form state for adding/editing users
    const [userForm, setUserForm] = useState({ id: '', email: '', full_name: '', organization: 'tcn', role: 'Viewer', employee_code: '', phone: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [appLang, setAppLang] = useState(localStorage.getItem('app_lang') || 'vi');
    const t = translations[appLang];

    useEffect(() => {
        if (!devUser) {
            checkUser();
        }
    }, [devUser]);

    useEffect(() => {
        if (view === 'users' || view === 'farmers') {
            fetchUsersList();
        }
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
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            alert(`FETCH_ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('User')
                    .update({
                        full_name: userForm.full_name,
                        organization: userForm.organization,
                        role: userForm.role,
                        employee_code: userForm.employee_code,
                        phone: userForm.phone
                    })
                    .eq('id', userForm.id);
                if (error) throw error;
            } else {
                // For a real app, you'd call a Supabase Edge Function to create an auth user
                // Here we just insert into our User table for demonstration of management
                const { error } = await supabase.from('User').insert([{
                    ...userForm,
                    id: crypto.randomUUID(), // Mocking ID for management-only entry
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
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
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
        if (onLogout) {
            await onLogout();
        } else {
            await supabase.auth.signOut();
        }
    };

    const menuItems = [
        {
            id: 'farmers',
            title: t.farmers,
            desc: t.farmers_desc,
            icon: 'fas fa-id-card',
            action: () => setView('farmers')
        },
        {
            id: 'farms',
            title: t.farms,
            desc: t.farms_desc,
            icon: 'fas fa-map-marked-alt',
            action: () => setView('farms')
        },
        {
            id: 'activities',
            title: t.activities,
            desc: t.activities_desc,
            icon: 'fas fa-calendar-check',
            action: () => setView('activities')
        },
        {
            id: 'planning',
            title: t.planning,
            desc: t.planning_desc,
            icon: 'fas fa-clipboard-list',
            action: () => setView('planning')
        },
        {
            id: 'training',
            title: t.training,
            desc: t.training_desc,
            icon: 'fas fa-graduation-cap',
            action: () => setView('training')
        },
        {
            id: 'model',
            title: t.model,
            desc: t.model_desc,
            icon: 'fas fa-seedling',
            action: () => setView('model')
        }
    ];

    const HomeView = () => (
        <div className="home-container">
            <div className="home-menu-grid">
                {menuItems.map(item => (
                    <div key={item.id} className="menu-card" onClick={item.action || (() => alert('Feature coming soon'))}>
                        <div className="card-icon">
                            <i className={item.icon}></i>
                        </div>
                        <div className="card-info">
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                        </div>
                        <div className="card-action">
                            {t.action_access} <i className="fas fa-arrow-right"></i>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const UserManagementView = () => (
        <div className="view-container">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setView('home')} className="btn-back" style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--sky-200)', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                    <i className="fas fa-arrow-left"></i> Quay lại
                </button>
                <button
                    onClick={() => {
                        setUserForm({ id: '', email: '', full_name: '', organization: 'tcn', role: 'Viewer', employee_code: '', phone: '' });
                        setIsEditing(false);
                        setShowUserModal(true);
                    }}
                    className="btn-add-user"
                    style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--tcn-dark)', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <i className="fas fa-user-plus"></i> THÊM NHÂN VIÊN MỚI
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3>Danh sách người dùng hệ thống</h3>
                    <div className="badge">{users.length} thành viên</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>Họ và tên</th>
                            <th>Email / Tài khoản</th>
                            <th>Tổ chức</th>
                            <th>Vai trò</th>
                            <th>Thao tác</th>
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
                                        <button
                                            onClick={() => {
                                                setUserForm(u);
                                                setIsEditing(true);
                                                setShowUserModal(true);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--coffee-medium)', cursor: 'pointer' }}
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple User Modal */}
            {showUserModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '500px' }}>
                        <h3 style={{ marginBottom: '25px', color: 'var(--coffee-dark)' }}>{isEditing ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}</h3>
                        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label>Họ và tên</label>
                                <input className="input-pro" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input className="input-pro" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} disabled={isEditing} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Mã nhân viên</label>
                                    <input className="input-pro" value={userForm.employee_code} onChange={e => setUserForm({ ...userForm, employee_code: e.target.value })} placeholder="VD: TCN-001" />
                                </div>
                                <div className="form-group">
                                    <label>Số điện thoại</label>
                                    <input className="input-pro" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="09xx xxx xxx" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Tổ chức</label>
                                    <select className="input-pro" value={userForm.organization} onChange={e => setUserForm({ ...userForm, organization: e.target.value })}>
                                        <option value="tcn">Tần Cao Nguyên</option>
                                        <option value="tchibo">Tchibo</option>
                                        <option value="nkg">NKG</option>
                                        <option value="farmer">Nông hộ</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Vai trò</label>
                                    <select className="input-pro" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                        <option value="Admin">Admin</option>
                                        <option value="Viewer">Viewer</option>
                                        <option value="Farmer">Farmer</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{isEditing ? 'Cập nhật' : 'Thêm mới'}</button>
                                <button type="button" onClick={() => setShowUserModal(false)} className="btn-primary" style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="dashboard-layout">
            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span>{t.sidebar_branding}</span>
                </div>

                <nav className="nav-menu">
                    <a className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                        <i className="fas fa-home"></i>
                        <span>{t.home}</span>
                    </a>
                    <a className={`nav-item ${view === 'farmers' ? 'active' : ''}`} onClick={() => setView('farmers')}>
                        <i className="fas fa-id-card"></i>
                        <span>{t.farmers}</span>
                    </a>
                    <a className={`nav-item ${view === 'farms' ? 'active' : ''}`} onClick={() => setView('farms')}>
                        <i className="fas fa-map-marked-alt"></i>
                        <span>{t.farms}</span>
                    </a>
                    <a className={`nav-item ${view === 'activities' ? 'active' : ''}`} onClick={() => setView('activities')}>
                        <i className="fas fa-calendar-check"></i>
                        <span>{t.activities}</span>
                    </a>
                    <a className={`nav-item ${view === 'planning' ? 'active' : ''}`} onClick={() => setView('planning')}>
                        <i className="fas fa-clipboard-list"></i>
                        <span>{t.planning}</span>
                    </a>
                    <a className={`nav-item ${view === 'training' ? 'active' : ''}`} onClick={() => setView('training')}>
                        <i className="fas fa-graduation-cap"></i>
                        <span>{t.training}</span>
                    </a>
                    <a className={`nav-item ${view === 'model' ? 'active' : ''}`} onClick={() => setView('model')}>
                        <i className="fas fa-seedling"></i>
                        <span>{t.model}</span>
                    </a>
                    <a className={`nav-item ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>
                        <i className="fas fa-users-cog"></i>
                        <span>{t.users}</span>
                    </a>
                </nav>

                <div className="sidebar-footer">
                    <div onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i>
                        <span>{t.logout}</span>
                    </div>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="main-content">
                <div className="home-logo-bar persistent-branding">
                    <img src="https://raw.githubusercontent.com/locvutrunglvt/Tancaonguyen/refs/heads/main/tancaonguyen_old/TCN%20logo.jpg" alt="TCN" />
                    <img src="https://logos-world.net/wp-content/uploads/2023/03/Tchibo-Logo.jpg" alt="Tchibo" />
                    <img src="https://nkgvietnam.com/wp-content/uploads/2023/05/NKG-Vietnam_Logo_left-1-01.svg" alt="NKG" className="logo-nkg" />
                </div>

                <h1 className="project-main-title persistent-title">
                    {t.project_title}
                </h1>

                <header className="header-top">
                    <div className="dashboard-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div onClick={handleLogout} className="mobile-only-logout" style={{ cursor: 'pointer', display: 'none' }}>
                            <i className="fas fa-sign-out-alt" style={{ color: '#ef4444', fontSize: '20px' }}></i>
                        </div>

                        {/* In-app Language Selector */}
                        <div className="in-app-lang" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.7)', padding: '5px 10px', borderRadius: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                            <button className={`lang-mini-btn ${appLang === 'vi' ? 'active' : ''}`} onClick={() => setAppLang('vi')} style={{ border: 'none', background: 'none', cursor: 'pointer', outline: 'none', filter: appLang === 'vi' ? 'none' : 'grayscale(1)', transition: '0.3s' }}>
                                <img src="https://flagcdn.com/w20/vn.png" alt="VI" />
                            </button>
                            <button className={`lang-mini-btn ${appLang === 'en' ? 'active' : ''}`} onClick={() => setAppLang('en')} style={{ border: 'none', background: 'none', cursor: 'pointer', outline: 'none', filter: appLang === 'en' ? 'none' : 'grayscale(1)', transition: '0.3s' }}>
                                <img src="https://flagcdn.com/w20/gb.png" alt="EN" />
                            </button>
                            <button className={`lang-mini-btn ${appLang === 'ede' ? 'active' : ''}`} onClick={() => setAppLang('ede')} style={{ border: 'none', background: appLang === 'ede' ? 'var(--coffee-dark)' : 'none', color: appLang === 'ede' ? 'white' : 'var(--coffee-dark)', cursor: 'pointer', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold' }}>
                                EĐ
                            </button>
                        </div>
                    </div>

                    <div className="welcome-section">
                        <p>{t.welcome}</p>
                        <h2>{currentUser?.email?.split('@')[0] || t.admin}</h2>
                    </div>
                </header>

                {/* Conditional Rendering of Views */}
                {view === 'home' && <HomeView />}
                {view === 'users' && <UserManagementView />}
                {view === 'model' && <ModelManagement onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'activities' && <AnnualActivities onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'training' && <TrainingCenter onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'farms' && <FarmProfiles onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'planning' && <SeasonalPlanning onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
                {view === 'farmers' && <FarmerManagement onBack={() => setView('home')} devUser={devUser} appLang={appLang} />}
            </main>
        </div>
    );
};

export default Dashboard;
